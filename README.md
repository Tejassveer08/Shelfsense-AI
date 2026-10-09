# ShelfSense — LLM-Powered Semantic Book Recommender

> Describe what you want to read in plain English (*"a slow, melancholic novel about leaving home, nothing too long"*) and discover ranked, explainable literary recommendations.

ShelfSense is a modern, editorial semantic book discovery application built on a curated dataset of over 5,200 volumes. It features hybrid dense-sparse retrieval (Dense Embeddings + BM25 with Reciprocal Rank Fusion), continuous multidimensional **Vibe Sliders**, 9-dimensional **Book DNA** radar charts with side-by-side comparison, an interactive 2D UMAP **Discovery Galaxy**, a persistent **Reading Shelf**, and a conversational **Refine with AI** librarian drawer.

---

## Architecture Overview

```mermaid
graph TD
    subgraph DataPipeline["Data Pipeline & Knowledge Base (scripts/build_index.py)"]
        CSV[Kaggle 7k Books with Metadata] --> Clean[Text & Metadata Cleaning]
        Clean --> DenseEmbed[Dense Embeddings: all-MiniLM-L6-v2]
        Clean --> BM25Index[BM25 Okapi Inverted Index]
        Clean --> EmotionScores[DistilRoBERTa 7 Emotion Scores]
        Clean --> VibeAnchors[Vibe Anchor Projections]
        DenseEmbed --> ChromaDB[(Persistent ChromaDB Collection)]
        DenseEmbed --> UMAP[2D UMAP Semantic Manifold]
        BM25Index --> BM25Pickle[(Serialized BM25 Pickle)]
        EmotionScores --> EnrichedCatalog[(Enriched Metadata Catalog)]
        VibeAnchors --> EnrichedCatalog
        UMAP --> GalaxyJSON[(Discovery Galaxy Nodes)]
    end

    subgraph Backend["FastAPI Backend (backend/app/)"]
        FastAPI[FastAPI Gateway]
        FastAPI --> SearchAPI["POST /api/search (Hybrid RRF + Sliders)"]
        FastAPI --> SimilarAPI["POST /api/similar (Taste Vector + Contrast)"]
        FastAPI --> ExplainAPI["POST /api/explain (Gemini / Offline Fallback)"]
        FastAPI --> ChatAPI["POST /api/chat (Conversational Refine)"]
        FastAPI --> BookAPI["GET /api/book/{isbn13}"]
        FastAPI --> GalaxyAPI["GET /api/galaxy"]
        FastAPI --> HealthAPI["GET /api/health"]
        
        SearchAPI --> RetrievalService[Retrieval & Ranking Engine]
        RetrievalService --> ChromaDB
        RetrievalService --> BM25Pickle
        ExplainAPI --> LLMService[Pluggable LLM Provider]
        ChatAPI --> LLMService
    end

    subgraph Frontend["Next.js App Router & TypeScript (frontend/)"]
        ExplorerView["Explorer / Hero & Results Grid"]
        VibeToolbar["Vibe Sliders Toolbar (Live Re-rank)"]
        BookDetailModal["Book Detail & DNA Radar Modal"]
        TasteModal["Taste Profile ('Books I Love')"]
        GalaxyView["Discovery Galaxy (Canvas 2D Scatter)"]
        ShelfView["Reading Shelf (Drag-and-Drop)"]
        ChatDrawer["Conversational Refine Drawer"]
    end

    Frontend --> Backend
```

---

## Quickstart

### 1. Clone & Setup Environment
```bash
git clone https://github.com/your-username/shelfsense.git
cd shelfsense
cp .env.example .env
```
*(Optional: add your Gemini API key to `.env` for LLM-written explanations; `.env.example` lists the variable name. Without a key, the app uses the offline fallback.)*

### 2. Install Backend Dependencies
```bash
py -3.11 -m pip install -r requirements.txt
```
*(On macOS/Linux, use `python3.11` instead of `py -3.11`.)*

### 3. Get the Data & Build the Index
The data is not stored in this repository (see [Data & Generated Files](#data--generated-files)). Pick one option.

#### Option A: Full Goodreads catalogue (2.36M books)
Uses the [UCSD Book Graph](https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/UCSD%20Book%20Graph.html) Goodreads data. Download these two files from the dataset page into `data/`:

- [`goodreads_books.json.gz`](https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/goodreads_books.json.gz): book metadata
- `goodreads_book_authors.json.gz`: author names (linked under "Author information" on the dataset page)

Then build the author lookup and stream the books into the index:

```bash
py -3.11 scripts/build_authors_db.py --gz-path data/goodreads_book_authors.json.gz
py -3.11 scripts/stream_goodreads_index.py --gz-path data/goodreads_books.json.gz
```

`stream_goodreads_index.py` reads the file line by line, so memory use stays low. For each book it embeds the text with `all-MiniLM-L6-v2`, computes the vibe and emotion scores, and writes to a SQLite database with FTS5 full-text search (`data/goodreads.db`) and a ChromaDB collection (`data/chroma_db/`, collection `goodreads_books`).

| Option | Default | Purpose |
|---|---|---|
| `--gz-path` | none (set it explicitly) | Path to `goodreads_books.json.gz` |
| `--max-books` | all | Stop after this many books are indexed |
| `--min-ratings` | `0` | Skip books with fewer ratings than this |
| `--min-words` | `20` | Skip books whose description is shorter than this |
| `--batch-size` | `128` | Books embedded per batch |

Indexing all 2.36M books takes a long time and a lot of disk space. For a first run, try a subset, for example `--min-ratings 100`, or `--max-books 5000` for a quick test. The script is **resumable**: if you interrupt it, run the same command again and it skips books that are already indexed. Live progress is written to `data/ingestion_status.json`.

> If `data/authors.db` is missing, the script still runs but shows authors as "Author <id>".

#### Option B: Quick demo index (Kaggle, 5,230 books)
A small curated set that indexes in minutes. Download [7k Books with Metadata](https://www.kaggle.com/datasets/dylanjcastillo/7k-books-with-metadata) from Kaggle and place `books.csv` in `data/`. With the [Kaggle CLI](https://github.com/Kaggle/kaggle-api) configured:

```bash
kaggle datasets download -d dylanjcastillo/7k-books-with-metadata -p data --unzip
py -3.11 scripts/build_index.py
```
*(Note: Initial indexing downloads models, cleans 5,230 books, and precomputes emotion scores, embeddings, UMAP coordinates, and BM25 index. Outputs are cached in `data/` for instantaneous subsequent starts).*

### 4. Start Backend Server
```bash
py -3.11 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 5. Install Frontend Dependencies & Start App
```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:3000** to explore the library!

---

## Data & Generated Files

Everything under `data/` is downloaded or generated locally and **none of it is committed to Git**:

| File | Created by | Contents |
|---|---|---|
| `goodreads_books.json.gz`, `goodreads_book_authors.json.gz` | you (download) | Raw Goodreads data |
| `authors.db` | `build_authors_db.py` | Author id to name lookup |
| `goodreads.db` | `stream_goodreads_index.py` | Book metadata, vibe/emotion scores, FTS5 keyword index |
| `chroma_db/` | `stream_goodreads_index.py` | ChromaDB vector store |
| `ingestion_status.json` | `stream_goodreads_index.py` | Live indexing progress |

Two reasons to keep them out of the repo:

1. **Size.** `goodreads.db` and the ChromaDB files are far over GitHub's 100 MB per-file limit.
2. **Licence.** The Goodreads data was collected for academic use only and may not be redistributed or used commercially (see the [dataset page](https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/UCSD%20Book%20Graph.html)). The databases contain book descriptions from it.

Add this to `.gitignore`:

```gitignore
data/*
!data/.gitkeep
```

**Rebuilding the index.** If you change the embedding model, the filters or the scoring logic, delete the generated files in `data/` (keep the downloaded `.json.gz` files) and run the build scripts again. The model that encodes search queries at runtime must be the same one used to build the index (`sentence-transformers/all-MiniLM-L6-v2`), otherwise rankings will be meaningless.

---

## How the Ranking Works

ShelfSense implements a multi-stage hybrid ranking and re-ranking architecture designed to optimize both semantic intent and reader preference:

### 1. Dense Semantic Retrieval
The user's natural language inquiry is encoded into a 384-dimensional normalized vector using `sentence-transformers/all-MiniLM-L6-v2`. ChromaDB computes cosine distances across the 5,230 book document representations:
$$\text{sim}_{\text{dense}}(q, d) = 1.0 - \text{cosine\_dist}(q, d)$$
The top 120 dense candidates are retained with their ranks $\text{rank}_{\text{dense}}(d)$.

### 2. Lexical Keyword Matching (BM25)
Concurrently, the query is tokenized and scored against the BM25 inverted index (`rank_bm25.BM25Okapi`) built from book titles, authors, categories, and descriptions. The top 120 lexical matches are retained with their ranks $\text{rank}_{\text{bm25}}(d)$.

### 3. Reciprocal Rank Fusion (RRF)
To prevent scale variance between vector cosine similarity and unbounded BM25 scores, candidates are merged using Reciprocal Rank Fusion:
$$\text{RRF Score}(d) = \frac{0.60}{60 + \text{rank}_{\text{dense}}(d)} + \frac{0.40}{60 + \text{rank}_{\text{bm25}}(d)}$$
Where $k = 60$ is the standard smoothing constant. RRF scores are normalized into $[0, 1]$.

### 4. Continuous Vibe Slider Re-Ranking
ShelfSense introduces 4 continuous vibe axes in $[-1.0, 1.0]$:
- **Dark ↔ Light**: Derived from emotion valence ($\text{joy} - (\text{sadness} + \text{fear} + \text{anger})$) combined with semantic projection onto light/dark anchor concepts.
- **Fast-paced ↔ Slow-burn**: Derived from narrative pacing anchor projection.
- **Cerebral ↔ Escapist**: Cosine projection onto intellectual literature versus escapist adventure.
- **Short ↔ Epic**: Non-linear page count normalization centered at 320 pages.

When the reader adjusts a slider to $S_{\text{axis}}$, an alignment multiplier is applied:
$$\text{alignment}_{\text{axis}} = 1.0 - \frac{|S_{\text{axis}} - B_{\text{axis}}|}{2.0}$$
$$\text{Multiplier} = 1.0 + \sum_{\text{axes}} |S_{\text{axis}}| \times (\text{alignment}_{\text{axis}} - 0.5) \times 0.8$$
$$\text{Final Score}(d) = \text{RRF Score}(d) \times \text{Multiplier}$$

### 5. Grounded Snippet Highlighting & LLM Explanations
For each candidate, the description is broken into sentences. Sentence-level cosine similarity extracts the exact sentence that best answers the user's inquiry. The pluggable LLM provider (Google Gemini or offline fallback) generates a concise 1–2 sentence explanation grounded strictly in the book's verified text.

---

## Features

| Feature | Description |
|---|---|
| **Natural Language Search** | Debounced search box with rotating animated prompt ideas and example inspiration chips. |
| **Vibe Sliders** | Continuous live re-ranking sliders (Dark ↔ Light, Fast-paced ↔ Slow-burn, Cerebral ↔ Escapist, Short ↔ Epic). |
| **Why this book?** | LLM-generated rationale grounded strictly in book description + highlighted sentence snippet. |
| **Book DNA Radar Chart** | 9-dimensional radar visualization (7 emotions + Pacing + Length) with side-by-side comparison modal. |
| **Taste Profile ("Books I Love")** | Select 1–5 books, adjust star ratings, and synthesize composite taste vectors with attribution. |
| **Contrast Mode** | "Like this book, but..." vector arithmetic ($v_{\text{book}} + \alpha \cdot v_{\text{modifier}}$). |
| **Discovery Galaxy** | 2D UMAP projection rendering all 5,230 books on an interactive, zoomable, genre-colored canvas. |
| **Reading Shelf** | Want to Read / Reading / Finished board with localStorage persistence, drag-and-drop, and shelf-based recommendations. |
| **Conversational Refine** | Chat drawer with stateful AI librarian that updates query, filters, sliders, and results in place. |
| **Explainable Ranking** | "How was this ranked?" popovers detailing dense rank, BM25 rank, RRF score, and vibe adjustments. |
| **Editorial Modern Library UI** | Warm paper & deep ink palette, typography pairing (Newsreader serif + Plus Jakarta Sans), 3D cover tilt, dark mode toggle. |

---

## API Documentation

- `POST /api/search`: Hybrid search with filters and vibe sliders.
- `POST /api/similar`: Taste profile synthesis and contrast mode recommendations.
- `POST /api/explain`: Grounded explanation and matching sentence extraction.
- `POST /api/chat`: Conversational refinement drawer updates.
- `GET /api/book/{isbn13}`: Detailed book metadata and DNA scores.
- `GET /api/galaxy`: Precomputed 2D UMAP scatter coordinates.
- `GET /api/health`: Health status and index statistics.

Interactive Swagger documentation is available at **http://localhost:8000/docs**.

---

## Data Sources & Citation

**Goodreads data: UCSD Book Graph.** Collected for academic use only; please do not redistribute it or use it commercially. If you use it, cite:

- Mengting Wan, Julian McAuley, "Item Recommendation on Monotonic Behavior Chains", in *RecSys'18*.
- Mengting Wan, Rishabh Misra, Ndapa Nakashole, Julian McAuley, "Fine-Grained Spoiler Detection from Large-Scale Review Corpora", in *ACL'19*.

**Quick demo data: [7k Books with Metadata](https://www.kaggle.com/datasets/dylanjcastillo/7k-books-with-metadata)** by Dylan Castillo on Kaggle, built from ISBNs in Soumik's Goodreads-books dataset enriched via the Google Books API.
