"""
Chapters 1 to 3 generator module:
- Chapter 1: Introduction (Arabic Pages 1 to 6)
- Chapter 2: Requirement Analysis & SRS (Arabic Pages 7 to 14)
- Chapter 3: System Architecture & High-Level Design (Arabic Pages 15 to 22)
"""

def generate_chapters_1_3() -> list[str]:
    pages = []

    # =========================================================================
    # CHAPTER 1: INTRODUCTION (Arabic Pages 1 to 6)
    # =========================================================================

    # ARABIC PAGE 1 (Chapter Title Page -> Unnumbered)
    p = """
    <div class="page" id="page-ch1-1">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 15px;">CHAPTER 1</h1>
            <h2 class="chapter-subtitle">INTRODUCTION</h2>

            <h2 class="section-heading">1.1 Background and Motivation</h2>
            <p>
                In the contemporary information era, the exponential proliferation of published literature has created
                an acute discovery paradox for avid readers, scholars, and casual bibliophiles alike. Millions of unique
                titles span across global distribution channels, electronic book repositories, and open archival libraries.
                However, human cognitive bandwidth remains inherently finite. Readers do not conceptualize their literary
                cravings through sterile taxonomic classifications such as Dewey Decimal numbers or rigid merchant categories;
                rather, they experience desires through rich affective nuances, thematic textures, and stylistic sensibilities.
                A reader frequently seeks <em>&ldquo;a slow, melancholic novel about leaving home, nothing too long,&rdquo;</em>
                or <em>&ldquo;an intellectually rigorous, fast-paced thriller set in a claustrophobic academic institution.&rdquo;</em>
            </p>
            <p>
                Traditional recommender paradigms—dominated by user-item collaborative filtering and superficial keyword
                search—fail conspicuously when confronted with such queries. Collaborative filtering requires extensive historical
                interaction records, inherently suffering from catastrophic cold-start deficits for newly published works and
                exhibiting an aggressive popularity bias toward blockbuster titles. Conversely, conventional search engines execute
                verbatim lexical matching over catalog metadata, completely ignoring emotional undertones, narrative cadence,
                and complex conceptual metaphors.
            </p>
            <p>
                The emergence of Large Language Models (LLMs) and dense sentence embedding transformers presents an unprecedented
                opportunity to bridge this semantic gulf. By projecting unstructured literary prose and multi-layered reader
                inquiries into shared geometric vector spaces, it is now technically feasible to match queries based on deep
                semantic resonance rather than superficial lexical overlap.
            </p>
        </div>
        <!-- Unnumbered chapter title page -->
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 2
    p = """
    <div class="page" id="page-ch1-2">
        <div class="page-content">
            <h2 class="section-heading">1.2 The Paradigm Shift in Literary Recommendation</h2>
            <p>
                For over two decades, digital book discovery has remained essentially unchanged. Major storefronts like
                Amazon Books and community networks like Goodreads rely primarily on matrix factorization, item-to-item
                collaborative filtering, and co-purchase graph traversal. While commercially potent for surfacing mass-market
                bestsellers, this paradigm creates severe &ldquo;filter bubbles&rdquo; where idiosyncratic, indie, or backlist
                titles remain perpetually buried in the long tail of the distribution catalog.
            </p>
            <p>
                Furthermore, the fundamental interaction primitive of these platforms is passive: the user is expected to type
                an exact author surname, a known book title, or navigate rigid drop-down menus containing predetermined genre
                labels. If a user enters an emotional description, standard e-commerce search engines return either zero results
                or spurious matches that happen to contain literal words like &ldquo;slow&rdquo; or &ldquo;home&rdquo; in their
                publisher blurbs.
            </p>
            <p>
                <strong>ShelfSense AI</strong> initiates a profound architectural paradigm shift by establishing semantic intent,
                affective tone, and explainable vector arithmetic as the core discovery primitives. Rather than treating books as
                discrete item identifiers in an interaction matrix, ShelfSense treats every volume as a multi-dimensional semantic
                entity characterized by its narrative synopsis, emotional profile, narrative pacing, intellectual depth, and
                relative geometry in high-dimensional embedding space. Through this lens, search is transformed from an exact
                keyword retrieval task into an exploratory voyage across a continuous literary manifold.
            </p>
            <h2 class="section-heading">1.3 Problem Statement & Practical Deficiencies</h2>
            <p>
                The core problem addressed by this industrial training project can be formulated across three critical engineering
                and user-experience bottlenecks observed in existing systems:
            </p>
            <ul>
                <li><strong>The Cold-Start & Popularity Bias Barrier:</strong> Collaborative systems cannot recommend books with
                sparse user reviews, regardless of their exceptional literary merit.</li>
                <li><strong>The Semantic Blindness of Lexical Search:</strong> Inverted indices based on TF-IDF or raw BM25 lack
                conceptual awareness and fail entirely on evocative, metaphorical queries.</li>
            </ul>
        </div>
        <div class="page-footer">(2)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 3
    p = """
    <div class="page" id="page-ch1-3">
        <div class="page-content">
            <h2 class="section-heading">1.3 Problem Statement (Continued)</h2>
            <ul>
                <li><strong>The Black-Box Opacity Problem:</strong> Traditional machine learning recommenders output ranked lists
                devoid of human-interpretable justifications. The reader is given no insight into why a title was selected,
                what emotional journey it promises, or which specific elements match their criteria.</li>
                <li><strong>The Generative Hallucination Hazard:</strong> Pure conversational LLM chatbots frequently fabricate
                fictitious book titles, invent imaginary plots, or misattribute authors when asked for book recommendations,
                lacking grounded linkage to physical, cataloged editions.</li>
                <li><strong>Static Non-Steerable Result Sets:</strong> Standard search results present a rigid ranking that
                cannot be interactively steered in real-time according to subtle mood shifts (e.g., dial down darkness, dial up
                pacing) without restarting the query from scratch.</li>
            </ul>

            <h2 class="section-heading">1.4 Objectives & Scope of ShelfSense AI</h2>
            <p>
                To resolve the identified challenges, the primary objective of this project is to develop and deploy
                <strong>ShelfSense AI</strong>, an end-to-end industrial software system that provides real-time, explainable,
                and steerable semantic book discovery. The detailed technical objectives include:
            </p>
            <ol>
                <li><strong>Architect a Hybrid Multi-Stage Retrieval Engine:</strong> Unify 384-dimensional dense semantic vector
                search (ChromaDB + <code>all-MiniLM-L6-v2</code>) with lexical keyword matching (BM25 Okapi) using Reciprocal
                Rank Fusion (RRF) to capture both semantic vibes and specific entities (e.g., proper nouns, authors, titles).</li>
                <li><strong>Formulate Continuous Multi-Dimensional Vibe Sliders:</strong> Derive mathematically continuous vibe
                axes (<em>Dark &harr; Light</em>, <em>Fast-paced &harr; Slow-burn</em>, <em>Cerebral &harr; Escapist</em>,
                <em>Short &harr; Epic</em>) utilizing 7-class DistilRoBERTa emotion distributions and semantic anchor concept projections.</li>
                <li><strong>Engineer a Zero-Hallucination Grounded Explainability Pipeline:</strong> Extract exact sentence-level
                cross-cosine similarity snippets from verified descriptions and prompt a pluggable LLM layer to deliver concise,
                grounded justifications.</li>
            </ol>
        </div>
        <div class="page-footer">(3)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 4
    p = """
    <div class="page" id="page-ch1-4">
        <div class="page-content">
            <h2 class="section-heading">1.5 Technological Landscape & Comparative Analysis</h2>
            <p>
                Recommendation systems have evolved across several discrete technological generations. To understand the
                distinct position of ShelfSense AI, Figure 1.1 delineates the architectural trajectory from early heuristics
                to modern neural retrieval.
            </p>

            <div class="figure-container">
                <div class="figure-box" style="font-family: monospace; font-size: 9.5pt; text-align: left; line-height: 1.25;">
+-------------------------------------------------------------------------------+<br>
| GENERATION 1: HEURISTIC & RULE-BASED (1995-2002)                               |<br>
| - Hardcoded genre taxonomies, popularity leaderboards, manual editorial picks  |<br>
+-------------------------------------------------------------------------------+<br>
                                       &darr;<br>
+-------------------------------------------------------------------------------+<br>
| GENERATION 2: COLLABORATIVE FILTERING & MATRIX FACTORIZATION (2003-2015)       |<br>
| - SVD, ALS, User-User/Item-Item co-visitation. Strong cold-start penalty.      |<br>
+-------------------------------------------------------------------------------+<br>
                                       &darr;<br>
+-------------------------------------------------------------------------------+<br>
| GENERATION 3: PURE DENSE NEURAL EMBEDDINGS (2016-2022)                         |<br>
| - Bi-encoders, cosine similarity. High semantic recall; poor lexical precision.|<br>
+-------------------------------------------------------------------------------+<br>
                                       &darr;<br>
+-------------------------------------------------------------------------------+<br>
| GENERATION 4: SHELFSENSE AI HYBRID MULTI-OBJECTIVE ARCHITECTURE (PRESENT)     |<br>
| - Dense + Sparse RRF + Continuous Vibe Projections + Grounded LLM Rationale    |<br>
+-------------------------------------------------------------------------------+
                </div>
                <div class="figure-caption">Figure 1.1: Comparative Spectrum of Recommendation Methodologies</div>
            </div>

            <p>
                While Generation 2 systems optimize solely for historical interaction probability, and Generation 3 systems
                often suffer from &ldquo;semantic drift&rdquo; where specific keywords (e.g., &ldquo;Agatha Christie&rdquo;)
                are diluted by conceptual vectors, ShelfSense AI marries the precision of lexical inverted indices with the
                deep abstraction of dense neural models. Candidates retrieved from both streams are fused through a calibrated
                Reciprocal Rank Fusion function, ensuring that both thematic intention and exact entities receive optimal ranking weight.
            </p>
        </div>
        <div class="page-footer">(4)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 5
    p = """
    <div class="page" id="page-ch1-5">
        <div class="page-content">
            <h2 class="section-heading">1.6 Key Innovations & Value Propositions</h2>
            <p>
                Table 1.1 presents an exhaustive architectural comparison highlighting the specific engineering advantages
                introduced by ShelfSense AI in contrast to industry-standard paradigms.
            </p>

            <div class="table-caption">Table 1.1: Paradigm Comparison: Collaborative vs Content vs ShelfSense AI</div>
            <table class="academic-table" style="font-size: 9.5pt;">
                <thead>
                    <tr>
                        <th style="width: 22%;">Feature Dimension</th>
                        <th style="width: 26%;">Collaborative Filtering</th>
                        <th style="width: 26%;">Content-Based (BM25)</th>
                        <th style="width: 26%;">ShelfSense AI</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Query Input</strong></td>
                        <td>User ID / Interaction Log</td>
                        <td>Keywords / Booleans</td>
                        <td>Natural Language Prose</td>
                    </tr>
                    <tr>
                        <td><strong>Cold-Start Capability</strong></td>
                        <td>Fails (Zero interactions)</td>
                        <td>Moderate (Metadata only)</td>
                        <td>Excellent (Dense Vectors)</td>
                    </tr>
                    <tr>
                        <td><strong>Emotional Sensitivity</strong></td>
                        <td>None (Implicit ratings)</td>
                        <td>None (Lexical tokens)</td>
                        <td>High (DistilRoBERTa + Anchors)</td>
                    </tr>
                    <tr>
                        <td><strong>Explainability</strong></td>
                        <td>Black box / Co-rating</td>
                        <td>Matched term frequency</td>
                        <td>Grounded LLM Rationale</td>
                    </tr>
                    <tr>
                        <td><strong>Real-Time Steering</strong></td>
                        <td>None (Re-train model)</td>
                        <td>Query rewrite only</td>
                        <td>Continuous Vibe Sliders</td>
                    </tr>
                    <tr>
                        <td><strong>Exploration UI</strong></td>
                        <td>Paginated grids</td>
                        <td>Paginated lists</td>
                        <td>2D UMAP Galaxy + Radar DNA</td>
                    </tr>
                </tbody>
            </table>

            <p>
                The foundational value proposition of ShelfSense AI resides in transforming reader discovery into an active,
                playful, and intellectually grounded dialogue. Readers can inspect the multi-dimensional &ldquo;Book DNA&rdquo;
                radar chart of any title, visually compare two contrasting works across nine affective axes, dynamically steer
                results using Vibe Sliders without waiting for vector re-indexing, explore a 5,230-book celestial galaxy,
                and converse with a state-preserving AI librarian that updates the entire application state in place.
            </p>
        </div>
        <div class="page-footer">(5)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 6
    p = """
    <div class="page" id="page-ch1-6">
        <div class="page-content">
            <h2 class="section-heading">1.7 Organization of the Industrial Training Report</h2>
            <p>
                This industrial training report is structured systematically across eleven comprehensive chapters and two
                supplementary appendices, providing an exhaustive account of the theoretical formulation, architectural design,
                software implementation, empirical benchmarking, and deployment of ShelfSense AI:
            </p>
            <ul>
                <li><strong>Chapter 2: Requirement Analysis with SRS</strong> details the formal software requirements specification,
                outlining all functional requirements (FR1-FR10), non-functional constraints, hardware/software specifications,
                and actor use-case models.</li>
                <li><strong>Chapter 3: System Architecture and Design</strong> details the decoupled multi-tier architecture,
                microservice boundaries, sequence interactions, Pydantic data schemas, and design patterns.</li>
                <li><strong>Chapter 4: Data Engineering and Knowledge Base Pipeline</strong> covers corpus curation from Kaggle and
                Goodreads, data cleaning, DistilRoBERTa affective profiling, anchor vector projection, and 2D UMAP reduction.</li>
                <li><strong>Chapter 5: Hybrid Retrieval and Multi-Objective Ranking</strong> expounds the mathematical foundations
                of dense vector embeddings, BM25 Okapi, Reciprocal Rank Fusion, Vibe Slider alignment multipliers, and vector arithmetic.</li>
                <li><strong>Chapter 6: Large Language Model Integration and Explainability</strong> articulates the pluggable LLM
                provider interface, Google Gemini 2.5 Flash prompts, offline deterministic fallback engine, and anti-hallucination verification.</li>
                <li><strong>Chapter 7: Detailed System Implementation</strong> documents the FastAPI asynchronous backend, route handlers,
                and Next.js 14 frontend interactive visual components (SVG Radar, UMAP Galaxy, Reading Shelf).</li>
                <li><strong>Chapter 8: Software Quality Assurance and Testing</strong> presents test pyramid execution, unit/integration
                suites, retrieval benchmarks (NDCG@K, MRR), and security audits.</li>
                <li><strong>Chapter 9: DevOps, Containerization and Deployment</strong> discusses Docker multi-stage builds, orchestration
                via Docker Compose, and production Uvicorn tuning.</li>
                <li><strong>Chapter 10: Results and Observations</strong> presents empirical evaluations, ablation experiments, latency
                benchmarks, and user usability study outcomes.</li>
                <li><strong>Chapter 11: Conclusions and Future Scope</strong> summarizes research contributions and delineates future engineering directions.</li>
                <li><strong>References & Appendices</strong> provide 24 academic citations, high-fidelity UI screenshots, and core source code listings.</li>
            </ul>
        </div>
        <div class="page-footer">(6)</div>
    </div>
    """
    pages.append(p)

    # =========================================================================
    # CHAPTER 2: REQUIREMENT ANALYSIS WITH SRS (Arabic Pages 7 to 14)
    # =========================================================================

    # ARABIC PAGE 7 (Chapter Title Page -> Unnumbered)
    p = """
    <div class="page" id="page-ch2-1">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 15px;">CHAPTER 2</h1>
            <h2 class="chapter-subtitle">REQUIREMENT ANALYSIS WITH SRS</h2>

            <h2 class="section-heading">2.1 Introduction to Software Requirements Specification</h2>
            <p>
                The Software Requirements Specification (SRS) establishes a rigorous, unambiguous contract governing the functional
                capabilities, performance parameters, hardware/software operational environments, and interface specifications of
                <strong>ShelfSense AI</strong>. Conforming to IEEE 830-1998 standards for software requirements documentation, this
                chapter formalizes the architectural expectations required to deliver sub-second, multi-objective semantic discovery
                across thousands of literary titles.
            </p>

            <h2 class="section-heading">2.2 User Characteristics & Operational Profiles</h2>
            <p>
                The design of ShelfSense AI accommodates three primary user personas, each characterized by distinct operational
                demands and discovery goals:
            </p>
            <ul>
                <li><strong>The Exploratory Reader (Persona A):</strong> Possesses an evocative but unstructured literary appetite.
                Lacks exact author or title keywords. Requires an intuitive natural language search interface, dynamic mood/vibe
                adjustment controls, and visually captivating exploratory canvases (e.g., Discovery Galaxy, Book DNA radar) to discover
                unexpected gems.</li>
                <li><strong>The Targeted Scholar / Bibliophile (Persona B):</strong> Seeks books sharing specific narrative tropes,
                intellectual depth, or specific historical contexts. Relies heavily on combined keyword and semantic search, rigorous
                genre and publication date filters, and transparent ranking explanations detailing why specific books were retrieved.</li>
                <li><strong>The Literary Curator / Book Club Organizer (Persona C):</strong> Leverages composite taste vectors to synthesize
                recommendations based on multiple favorite books (&ldquo;Books I Love&rdquo;), uses contrast mode (&ldquo;Like this book,
                but darker&rdquo;), and manages persistent reading lists across Kanban workflow stages.</li>
            </ul>
        </div>
        <!-- Unnumbered chapter title page -->
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 8
    p = """
    <div class="page" id="page-ch2-2">
        <div class="page-content">
            <h2 class="section-heading">2.3 Functional Requirements Specification</h2>
            <p>
                The functional requirements define the explicit behaviors, transformations, and algorithmic outputs executed by the
                system across its backend microservices and frontend clients.
            </p>

            <h3 class="subsection-heading">FR1: Natural Language Semantic Inquiry Ingestion</h3>
            <p>
                The system shall ingest freeform natural language queries of arbitrary length (ranging from concise 3-word mood prompts
                to elaborate 100-word paragraph descriptions) via a debounced search input field. The system shall normalize the query,
                strip extraneous control characters, and generate a 384-dimensional dense floating-point vector using
                <code>all-MiniLM-L6-v2</code> within a maximum latency budget of 25 milliseconds.
            </p>

            <h3 class="subsection-heading">FR2: Sparse Lexical Keyword Retrieval</h3>
            <p>
                Concurrently with dense embedding generation, the system shall tokenize the query into lowercased linguistic stems,
                filter stop words, and query an in-memory BM25 Okapi inverted index populated across titles, authors, canonical categories,
                and book descriptions. The system shall retrieve the top 120 lexical candidate documents with their corresponding raw BM25
                scores and ordinal ranks.
            </p>

            <h3 class="subsection-heading">FR3: Reciprocal Rank Fusion (RRF) Ranking</h3>
            <p>
                The retrieval engine shall merge the candidate sets from dense vector search ($D$) and sparse BM25 search ($B$). For each
                unique document $d \in D \cup B$, the system shall compute an integrated RRF score using the calibrated formula:
            </p>
            <div class="equation-box">
                RRF(d) = \frac{0.60}{60 + \text{rank}_{\text{dense}}(d)} + \frac{0.40}{60 + \text{rank}_{\text{bm25}}(d)}
                <span class="equation-number">(2.1)</span>
            </div>
            <p>
                Where documents absent from a candidate list are assigned a default penalty rank of 500. All computed RRF values shall
                be dynamically normalized into the bounded interval $[0.0, 1.0]$.
            </p>
        </div>
        <div class="page-footer">(8)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 9
    p = """
    <div class="page" id="page-ch2-3">
        <div class="page-content">
            <h3 class="subsection-heading">FR4: Continuous Multi-Dimensional Vibe Slider Re-Ranking</h3>
            <p>
                The system shall support real-time re-ranking across four continuous orthogonal axes: <em>Dark &harr; Light</em>,
                <em>Fast-paced &harr; Slow-burn</em>, <em>Cerebral &harr; Escapist</em>, and <em>Short &harr; Epic</em>. Each axis
                shall accept values in the range $[-1.0, +1.0]$. When user sliders deviate from the neutral origin ($|S_{\text{axis}}| > 0.08$),
                the system shall calculate an alignment score against precomputed book vibe vectors and apply a multiplicative weight bonus
                to reorder the candidate set instantaneously without triggering new vector index lookups.
            </p>

            <h3 class="subsection-heading">FR5: 9-Dimensional Book DNA Radar Generation</h3>
            <p>
                For every book in the repository, the system shall maintain a 9-dimensional affective and structural vector consisting of
                seven discrete emotion probabilities (Joy, Sadness, Fear, Anger, Surprise, Disgust, Neutral) derived from DistilRoBERTa,
                a narrative pacing score, and a normalized page length score. The frontend shall render this data as a responsive SVG radar
                chart, enabling side-by-side comparative overlay between any two selected titles.
            </p>

            <div class="table-caption">Table 2.1: Functional Requirements Specification Matrix (Part 1)</div>
            <table class="academic-table" style="font-size: 9.5pt;">
                <thead>
                    <tr>
                        <th style="width: 12%;">Req ID</th>
                        <th style="width: 28%;">Functional Module</th>
                        <th style="width: 48%;">Verification Criteria</th>
                        <th style="width: 12%;">Priority</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td><strong>FR1</strong></td><td>Dense Vector Search</td><td>Generates 384-d normalized vector; queries ChromaDB</td><td>High</td></tr>
                    <tr><td><strong>FR2</strong></td><td>BM25 Inverted Index</td><td>Tokenizes query, matches inverted index, returns top 120</td><td>High</td></tr>
                    <tr><td><strong>FR3</strong></td><td>RRF Fusion</td><td>Harmonizes dense & sparse ranks with $k=60$ smoothing</td><td>High</td></tr>
                    <tr><td><strong>FR4</strong></td><td>Vibe Sliders</td><td>Applies real-time multiplicative re-ranking in memory</td><td>High</td></tr>
                    <tr><td><strong>FR5</strong></td><td>Book DNA Radar</td><td>Renders 9-axis polygonal radar overlay in SVG</td><td>Medium</td></tr>
                </tbody>
            </table>
        </div>
        <div class="page-footer">(9)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 10
    p = """
    <div class="page" id="page-ch2-4">
        <div class="page-content">
            <h3 class="subsection-heading">FR6: 2D UMAP Discovery Galaxy Canvas</h3>
            <p>
                The system shall project the high-dimensional book embedding manifold into two-dimensional Cartesian coordinates
                $(x, y) \in [-100, +100]^2$ using Uniform Manifold Approximation and Projection (UMAP). The frontend shall render all
                5,230 book nodes onto an HTML5 canvas supporting fluid 60fps pan, continuous zoom, category-based cluster coloring,
                hover metadata tooltips, and click-to-modal navigation.
            </p>

            <h3 class="subsection-heading">FR7: Composite Taste Profile Synthesis</h3>
            <p>
                The user shall be permitted to select between 1 and 5 favorite books and assign star ratings (1 to 5 stars). The system
                shall compute a power-weighted composite taste centroid vector $\vec{V}_{\text{taste}}$ and query the vector space to surface
                similar works while strictly excluding the input seed books from the recommended output set.
            </p>

            <h3 class="subsection-heading">FR8: Contrast Mode Vector Search</h3>
            <p>
                The system shall accept a base book ISBN and a natural language contrast modifier (e.g., <em>&ldquo;more philosophical,
                set in winter&rdquo;</em>), computing an offset target vector $\vec{V}_{\text{contrast}} = \text{normalize}(\vec{V}_{\text{base}} + 0.70 \cdot \vec{V}_{\text{mod}})$
                to retrieve books embodying the requested thematic transformation.
            </p>

            <h3 class="subsection-heading">FR9: Grounded LLM Rationale Generation</h3>
            <p>
                For any recommended book, the system shall isolate the exact sentence in the verified description that shares the highest
                cosine similarity with the user query, and invoke a pluggable LLM provider (Google Gemini 2.5 Flash or deterministic
                offline fallback) to produce a 1-2 sentence justification strictly constrained by verified text.
            </p>

            <h3 class="subsection-heading">FR10: Persistent Reading Shelf Management</h3>
            <p>
                The frontend shall provide a Kanban-style Reading Shelf with three workflow columns (&ldquo;Want to Read&rdquo;,
                &ldquo;Reading&rdquo;, &ldquo;Finished&rdquo;), supporting drag-and-drop state transitions and automatic client-side
                synchronization with browser <code>localStorage</code>.
            </p>
        </div>
        <div class="page-footer">(10)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 11
    p = """
    <div class="page" id="page-ch2-5">
        <div class="page-content">
            <h2 class="section-heading">2.4 Non-Functional Requirements (NFR)</h2>
            <p>
                Non-functional requirements specify the operational quality attributes, performance envelopes, reliability metrics,
                and architectural constraints governing the software system.
            </p>

            <div class="table-caption">Table 2.2: Non-Functional Performance & Reliability Standards</div>
            <table class="academic-table" style="font-size: 9.5pt;">
                <thead>
                    <tr>
                        <th style="width: 15%;">Requirement</th>
                        <th style="width: 25%;">Target Metric</th>
                        <th style="width: 60%;">Operational Specification</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>NFR1: Latency</strong></td>
                        <td>Sub-200ms p95</td>
                        <td>End-to-end search endpoint response time (excluding network transit) must not exceed 200 milliseconds under normal load.</td>
                    </tr>
                    <tr>
                        <td><strong>NFR2: Grounding</strong></td>
                        <td>100% Attribution</td>
                        <td>All generated recommendation rationales must cite verified description text; zero hallucinated facts allowed.</td>
                    </tr>
                    <tr>
                        <td><strong>NFR3: Scalability</strong></td>
                        <td>500k+ Books / 100 QPS</td>
                        <td>Architecture must sustain linear indexing throughput scaling to 2.3M books and 100 queries/sec on containerized nodes.</td>
                    </tr>
                    <tr>
                        <td><strong>NFR4: Reliability</strong></td>
                        <td>99.9% Uptime</td>
                        <td>Backend service must feature graceful degradation to offline template generators if external LLM APIs experience outages.</td>
                    </tr>
                    <tr>
                        <td><strong>NFR5: Portability</strong></td>
                        <td>OCI Container</td>
                        <td>Backend and frontend services must compile cleanly into standardized Docker images for cross-platform deployment.</td>
                    </tr>
                    <tr>
                        <td><strong>NFR6: UI Fluidity</strong></td>
                        <td>60 FPS Rendering</td>
                        <td>Canvas-based Discovery Galaxy and SVG radar charts must maintain 60 frames per second during pan and zoom interactions.</td>
                    </tr>
                </tbody>
            </table>

            <p>
                Particular architectural rigor is dedicated to <strong>NFR2 (Grounding Accuracy)</strong>. In recommender systems,
                user trust is fragile. If an AI claims a book contains a specific plot element or setting that proves completely false,
                reader trust is irreparably compromised. By coupling extractive sentence matching with strict prompt guardrails,
                ShelfSense AI enforces absolute adherence to catalog facts.
            </p>
        </div>
        <div class="page-footer">(11)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 12
    p = """
    <div class="page" id="page-ch2-6">
        <div class="page-content">
            <h2 class="section-heading">2.5 Hardware & Infrastructure Requirements</h2>
            <p>
                To support high-dimensional dense vector indexing, neural emotion classification, and responsive real-time inference,
                the required hardware infrastructure is partitioned into three operational tiers: Development, Batch Ingestion/Training,
                and Production Serving.
            </p>

            <div class="table-caption">Table 2.3: Hardware Resource Specifications Across Deployment Tiers</div>
            <table class="academic-table" style="font-size: 9.5pt;">
                <thead>
                    <tr>
                        <th style="width: 25%;">Hardware Component</th>
                        <th style="width: 25%;">Development Host</th>
                        <th style="width: 25%;">Batch Indexing Tier</th>
                        <th style="width: 25%;">Production Serving Host</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Processor (CPU)</strong></td>
                        <td>Intel Core i7 / AMD Ryzen 7 (8 Cores, 3.2 GHz)</td>
                        <td>Intel Xeon Scalable / AMD EPYC (16+ Cores)</td>
                        <td>4 vCPUs (Modern x86_64 or ARM64)</td>
                    </tr>
                    <tr>
                        <td><strong>System Memory (RAM)</strong></td>
                        <td>16 GB DDR4/DDR5</td>
                        <td>32 GB - 64 GB ECC DDR4</td>
                        <td>8 GB - 16 GB RAM</td>
                    </tr>
                    <tr>
                        <td><strong>Storage Subsystem</strong></td>
                        <td>512 GB NVMe SSD (PCIe 3.0, 2500 MB/s)</td>
                        <td>1 TB NVMe SSD (PCIe 4.0, 5000 MB/s)</td>
                        <td>50 GB High-IOPS Cloud SSD</td>
                    </tr>
                    <tr>
                        <td><strong>Graphics Accelerator (GPU)</strong></td>
                        <td>NVIDIA RTX 3060 (12 GB VRAM) / Optional</td>
                        <td>NVIDIA T4 / A10G (16 GB - 24 GB VRAM)</td>
                        <td>CPU Inference Mode / Optional T4</td>
                    </tr>
                    <tr>
                        <td><strong>Network Interface</strong></td>
                        <td>100 Mbps Ethernet / Wi-Fi 6</td>
                        <td>1 Gbps Dedicated Link</td>
                        <td>1 Gbps Cloud Virtual Network</td>
                    </tr>
                </tbody>
            </table>

            <p>
                During batch indexing (<code>scripts/build_index.py</code>), the transformer-based emotion classifier
                (<code>j-hartmann/emotion-english-distilroberta-base</code>) and sentence embedding model
                (<code>all-MiniLM-L6-v2</code>) benefit significantly from GPU tensor acceleration, reducing total processing time
                for 5,230 books from approximately 35 minutes on an 8-core CPU down to 3.8 minutes on an NVIDIA RTX 3060.
                However, for production inference, memory-mapped NumPy arrays, pickled BM25 objects, and ChromaDB allow the FastAPI
                backend to execute sub-180ms queries purely on cost-effective commodity CPU instances.
            </p>
        </div>
        <div class="page-footer">(12)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 13
    p = """
    <div class="page" id="page-ch2-7">
        <div class="page-content">
            <h2 class="section-heading">2.6 Software Stack & Toolchain Dependencies</h2>
            <p>
                The software architecture of ShelfSense AI is constructed upon modern, open-source programming frameworks,
                guaranteeing reproducibility, strict type safety, and minimal operational overhead:
            </p>

            <h3 class="subsection-heading">2.6.1 Operating System & Container Runtime</h3>
            <ul>
                <li><strong>Host Operating Systems:</strong> Ubuntu Linux 22.04 LTS (Primary Cloud Target) / Microsoft Windows 11 (Development).</li>
                <li><strong>Container Engine:</strong> Docker Engine 24.0+ with Docker Compose v2.20+ for multi-container orchestration.</li>
            </ul>

            <h3 class="subsection-heading">2.6.2 Backend Python Ecosystem (Python 3.11 / 3.12)</h3>
            <ul>
                <li><strong>API Framework:</strong> FastAPI 0.110.0+ for high-performance asynchronous ASGI request handling.</li>
                <li><strong>Web Server:</strong> Uvicorn 0.28.0+ running with uvloop and httptools.</li>
                <li><strong>Data Validation:</strong> Pydantic v2.7.0+ for strict schema definition, JSON serialization, and runtime coercion.</li>
                <li><strong>Dense Vector Embeddings:</strong> <code>sentence-transformers</code> 3.0.0+ with PyTorch 2.2+.</li>
                <li><strong>Vector Database:</strong> ChromaDB 0.5.0+ persistent client utilizing HNSW index.</li>
                <li><strong>Sparse Keyword Retrieval:</strong> <code>rank-bm25</code> 0.2.2 for BM25Okapi implementation.</li>
                <li><strong>Dimensionality Reduction:</strong> <code>umap-learn</code> 0.5.6 for uniform manifold approximation.</li>
                <li><strong>LLM Client:</strong> <code>google-genai</code> 0.1.0+ official SDK for Gemini 2.5 Flash API calls.</li>
            </ul>

            <h3 class="subsection-heading">2.6.3 Frontend Ecosystem (Node.js 20+ LTS)</h3>
            <ul>
                <li><strong>Framework:</strong> Next.js 14.2+ leveraging React 18 and App Router architecture.</li>
                <li><strong>Language:</strong> TypeScript 5.4+ with strict null checks and interface contracts.</li>
                <li><strong>Styling & Design System:</strong> Tailwind CSS 3.4+ configured with custom typography plugins.</li>
                <li><strong>Icons:</strong> Lucide React for modern, featherweight SVG UI iconography.</li>
            </ul>
        </div>
        <div class="page-footer">(13)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 14
    p = """
    <div class="page" id="page-ch2-8">
        <div class="page-content">
            <h2 class="section-heading">2.7 System Use Cases & Interaction Modeling</h2>
            <p>
                Figure 2.1 illustrates the comprehensive Use Case Model capturing actor interactions with the ShelfSense AI platform.
            </p>

            <div class="figure-container">
                <div class="figure-box" style="font-family: monospace; font-size: 8.5pt; text-align: left; line-height: 1.2;">
+---------------------------------------------------------------------------------------+<br>
|                                 SHELFSENSE AI SYSTEM                                  |<br>
|                                                                                       |<br>
|   [User / Reader]                                                                     |<br>
|          |                                                                            |<br>
|          +---&gt; (UC1: Submit Natural Language Query) --------&gt; &lt;&lt;include&gt;&gt; (Generate Vector)|<br>
|          |                                                                            |<br>
|          +---&gt; (UC2: Adjust Real-Time Vibe Sliders) --------&gt; &lt;&lt;extend&gt;&gt;  (Re-rank Output)|<br>
|          |                                                                            |<br>
|          +---&gt; (UC3: Inspect 9-D Book DNA Radar) -----------&gt; &lt;&lt;include&gt;&gt; (Affective Overlay)|<br>
|          |                                                                            |<br>
|          +---&gt; (UC4: Explore 2D Discovery Galaxy) ---------&gt; &lt;&lt;include&gt;&gt; (UMAP Canvas 60fps)|<br>
|          |                                                                            |<br>
|          +---&gt; (UC5: Request Grounded AI Explanation) ------&gt; &lt;&lt;include&gt;&gt; (Snippet Extraction)|<br>
|          |                                                                            |<br>
|          +---&gt; (UC6: Synthesize Multi-Book Taste Vector) ---&gt; &lt;&lt;include&gt;&gt; (Weighted Centroid) |<br>
|          |                                                                            |<br>
|          +---&gt; (UC7: Execute Contrast Search: "Like, But") -&gt; &lt;&lt;include&gt;&gt; (Vector Arithmetic)|<br>
|          |                                                                            |<br>
|          +---&gt; (UC8: Organize Kanban Reading Shelf) --------&gt; &lt;&lt;include&gt;&gt; (LocalStorage Sync)|<br>
|          |                                                                            |<br>
|          +---&gt; (UC9: Converse with Refine AI Librarian) ----&gt; &lt;&lt;include&gt;&gt; (State Sync Update)|<br>
+---------------------------------------------------------------------------------------+
                </div>
                <div class="figure-caption">Figure 2.1: ShelfSense AI System Use Case and Actor Interaction Diagram</div>
            </div>

            <p>
                As depicted, the primary actor (the reader) triggers use cases that seamlessly interact with underlying
                algorithmic sub-routines. In UC5, for example, requesting a grounded explanation transparently activates both
                sentence-level cross-cosine similarity extraction and the pluggable LLM generation workflow, returning a
                verified explanation alongside explicit ranking breakdowns.
            </p>
        </div>
        <div class="page-footer">(14)</div>
    </div>
    """
    pages.append(p)

    # =========================================================================
    # CHAPTER 3: SYSTEM ARCHITECTURE & HIGH-LEVEL DESIGN (Arabic Pages 15 to 22)
    # =========================================================================

    # ARABIC PAGE 15 (Chapter Title Page -> Unnumbered)
    p = """
    <div class="page" id="page-ch3-1">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 15px;">CHAPTER 3</h1>
            <h2 class="chapter-subtitle">SYSTEM ARCHITECTURE & HIGH-LEVEL DESIGN</h2>

            <h2 class="section-heading">3.1 Architectural Principles & Design Philosophy</h2>
            <p>
                The architectural design of <strong>ShelfSense AI</strong> is governed by five foundational software engineering principles
                tailored for real-time, data-intensive artificial intelligence applications:
            </p>
            <ul>
                <li><strong>Decoupled Microservice Separation:</strong> The data ingestion pipeline, dense/sparse retrieval engine,
                pluggable generative AI service, and interactive client presentation tiers are cleanly partitioned across well-defined
                API boundaries, allowing each layer to scale independently.</li>
                <li><strong>Asynchronous Non-Blocking I/O:</strong> Built atop Python&rsquo;s <code>asyncio</code> primitives and FastAPI,
                the backend gateway handles concurrent HTTP requests efficiently without thread starvation, crucial for managing
                out-of-process LLM API roundtrips.</li>
                <li><strong>Memory-First In-Process Retrieval:</strong> To satisfy sub-200ms latency objectives, dense embeddings,
                BM25 inverted indices, and enriched metadata dictionaries are held resident in memory or accessed via high-speed
                memory-mapped files.</li>
                <li><strong>Radical Transparency & Grounded Verifiability:</strong> Every recommended candidate carries transparent
                provenance metadata, including exact dense similarity scores, BM25 rank positions, vibe multiplier adjustments, and
                extracted sentence snippets.</li>
                <li><strong>Graceful Degradation & Resilience:</strong> The system maintains strict operational continuity through
                deterministic offline fallbacks whenever external cloud APIs (e.g., Google Gemini) experience network latency spikes,
                rate limits, or upstream outages.</li>
            </ul>
        </div>
        <!-- Unnumbered chapter title page -->
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 16
    p = """
    <div class="page" id="page-ch3-2">
        <div class="page-content">
            <h2 class="section-heading">3.2 High-Level Multi-Tier Architectural Blueprint</h2>
            <p>
                ShelfSense AI is architected into five distinct functional tiers, as visualized in Figure 3.1.
            </p>

            <div class="figure-container">
                <div class="figure-box" style="font-family: monospace; font-size: 8.5pt; text-align: left; line-height: 1.25;">
+------------------------------------------------------------------------------------+<br>
| TIER 1: CLIENT PRESENTATION (Next.js 14 App Router, TypeScript, Canvas, SVG)        |<br>
| [HeroSearch] [VibeSliders] [BookCard Grid] [DiscoveryGalaxy] [BookDNARadar] [Shelf] |<br>
+------------------------------------------------------------------------------------+<br>
                                          &updownarrow; JSON / REST HTTP<br>
+------------------------------------------------------------------------------------+<br>
| TIER 2: API GATEWAY & ROUTING (FastAPI, Pydantic Models, CORS Middleware)           |<br>
| [/api/search]   [/api/similar]   [/api/explain]   [/api/chat]   [/api/galaxy]      |<br>
+------------------------------------------------------------------------------------+<br>
                                          &updownarrow; Dependency Injection<br>
+------------------------------------------------------------------------------------+<br>
| TIER 3: RETRIEVAL & RANKING ENGINE (RetrievalService, SimilarityService)           |<br>
| [Query Encoder: all-MiniLM-L6-v2]  [RRF Merge (k=60)]  [Vibe Alignment Multiplier] |<br>
+------------------------------------------------------------------------------------+<br>
                   &updownarrow;                                     &updownarrow;<br>
+-------------------------------------+   +------------------------------------------+<br>
| TIER 4: PERSISTENT STORAGE          |   | TIER 5: PLUGGABLE LLM SERVICE            |<br>
| - ChromaDB (Dense Vector Store)     |   | - Google Gemini 2.5 Flash Provider       |<br>
| - BM25 Inverted Index (Pickle)      |   | - Deterministic Offline Fallback Engine  |<br>
| - Enriched Metadata Catalog (JSON)  |   | - Grounded Snippet Verifier              |<br>
+-------------------------------------+   +------------------------------------------+
                </div>
                <div class="figure-caption">Figure 3.1: High-Level Multi-Tier Architectural Blueprint</div>
            </div>

            <p>
                The presentation tier transmits structured JSON payloads to the API Gateway. The gateway validates request contracts
                using Pydantic schemas and dispatches requests to singleton service providers. Tier 3 executes vector encodings, queries
                both persistent storage channels in Tier 4, computes RRF fusion, applies real-time vibe weighting, and coordinates with
                Tier 5 for explanation generation.
            </p>
        </div>
        <div class="page-footer">(16)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 17
    p = """
    <div class="page" id="page-ch3-3">
        <div class="page-content">
            <h2 class="section-heading">3.3 End-to-End System Data Flow Pipeline</h2>
            <p>
                The flow of data through ShelfSense AI spans two macroscopic phases: the Offline Ingestion & Knowledge Base Pipeline,
                and the Online Real-Time Query Execution Pipeline. Figure 3.2 diagrams this end-to-end data lifecycle.
            </p>

            <div class="figure-container">
                <div class="figure-box" style="font-family: monospace; font-size: 8.5pt; text-align: left; line-height: 1.25;">
[Raw Kaggle/Goodreads CSV/JSON] ---&gt; [Data Cleansing & Metadata Harmonization]<br>
                                                       |<br>
               +---------------------------------------+---------------------------------------+<br>
               |                                       |                                       |<br>
               &darr;                                       &darr;                                       &darr;<br>
[all-MiniLM-L6-v2 Embedder]             [DistilRoBERTa Emotion Classifier]      [BM25 Text Tokenizer]<br>
               |                                       |                                       |<br>
               &darr;                                       &darr;                                       &darr;<br>
[384-d Vectors &rarr; ChromaDB]           [7-D Emotion Probabilities]             [Inverted Index &rarr; Pickle]<br>
               |                                       |                                       |<br>
               +-------------------+-------------------+                                       |<br>
                                   |                                                           |<br>
                                   &darr;                                                           |<br>
                      [4-Axis Vibe Projection & UMAP]                                          |<br>
                                   |                                                           |<br>
                                   &darr;                                                           |<br>
                      [books_enriched.json & galaxy_nodes.json] &lt;-------------------------------+<br>
                                   |<br>
               ==================== ONLINE QUERY PHASE ====================<br>
                                   |<br>
   [User Natural Language Query] &rarr; [Hybrid Dense/Sparse Retrieval] &rarr; [RRF Merge] &rarr;<br>
   [Vibe Slider Re-rank] &rarr; [Grounded Snippet Extraction] &rarr; [Gemini 2.5 Flash] &rarr; [UI Grid]
                </div>
                <div class="figure-caption">Figure 3.2: End-to-End System Data Flow Pipeline</div>
            </div>

            <p>
                During the offline phase, raw bibliographic records are scrubbed of HTML artifacts, mapped to 12 canonical genres,
                and enriched with 7 discrete emotion scores, 4 continuous vibe projections, 384-dimensional embeddings, and 2D UMAP coordinates.
                During the online phase, user queries traverse the hybrid retrieval and re-ranking pipeline within milliseconds.
            </p>
        </div>
        <div class="page-footer">(17)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 18
    p = """
    <div class="page" id="page-ch3-4">
        <div class="page-content">
            <h2 class="section-heading">3.4 Subsystem Interconnections & Gateway Architecture</h2>
            <p>
                The backend subsystem is constructed as a modular FastAPI application organized into specialized route controllers,
                service singletons, and cross-cutting middleware components:
            </p>
            <ul>
                <li><strong>CORS Middleware:</strong> Configured with permissive origins for local development (<code>localhost:3000</code>)
                and strict origin policies in production containers, ensuring secure cross-origin resource sharing.</li>
                <li><strong>Dependency Injection Container (<code>dependencies.py</code>):</strong> Manages the lifecycle of heavy
                singletons (<code>RetrievalService</code>, <code>SimilarityService</code>, <code>LLMService</code>). Models and indices
                are loaded exactly once during application startup, preventing redundant RAM allocation across concurrent requests.</li>
                <li><strong>Search Controller (<code>routers/search.py</code>):</strong> Ingests <code>SearchRequest</code> payloads,
                coordinates parallel dense and sparse candidate generation, applies hard metadata filters (category, year, pages, rating),
                computes vibe adjustments, and formats response items.</li>
                <li><strong>Similarity Controller (<code>routers/similar.py</code>):</strong> Implements vector algebra endpoints for
                taste profile synthesis and contrast mode recommendations.</li>
                <li><strong>Explainability Controller (<code>routers/explain.py</code>):</strong> Orchestrates sentence snippet isolation
                and invokes the configured LLM provider to construct grounded rationales.</li>
                <li><strong>Chat Controller (<code>routers/chat.py</code>):</strong> Manages conversational state tracking for the AI librarian drawer.</li>
                <li><strong>Galaxy Controller (<code>routers/galaxy.py</code>):</strong> Streams precomputed 2D UMAP node coordinates to the frontend canvas.</li>
            </ul>
        </div>
        <div class="page-footer">(18)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 19
    p = """
    <div class="page" id="page-ch3-5">
        <div class="page-content">
            <h2 class="section-heading">3.5 Sequence Diagram: Query Execution & Explanation</h2>
            <p>
                Figure 3.3 illustrates the message exchange sequence between user client, API controllers, retrieval engines,
                vector storage, and the generative LLM layer during a typical search and explain interaction.
            </p>

            <div class="figure-container">
                <div class="figure-box" style="font-family: monospace; font-size: 8pt; text-align: left; line-height: 1.2;">
Client (Next.js)      FastAPI Gateway      RetrievalService      Chroma / BM25      Gemini Provider<br>
       |                     |                    |                    |                   |<br>
       |--- POST /search ---&gt;|                    |                    |                   |<br>
       |    {query, sliders} |--- search() ------&gt;|                    |                   |<br>
       |                     |                    |--- query(emb) ----&gt;|                   |<br>
       |                     |                    |&lt;-- dense top120 ---|                   |<br>
       |                     |                    |--- get_scores() --&gt;|                   |<br>
       |                     |                    |&lt;-- sparse top120 --|                   |<br>
       |                     |                    |                    |                   |<br>
       |                     |                    |-- [Compute RRF]    |                   |<br>
       |                     |                    |-- [Vibe Re-rank]   |                   |<br>
       |                     |                    |-- [Snippet Match]  |                   |<br>
       |                     |&lt;-- BookItems list -|                    |                   |<br>
       |&lt;-- JSON Results ----|                    |                    |                   |<br>
       |                     |                    |                    |                   |<br>
       |--- POST /explain --&gt;|                    |                    |                   |<br>
       |    {isbn13, query}  |--- explain() ----------------------------------------------&gt;|<br>
       |                     |                                         |                   |-- [Verify Grounding]<br>
       |                     |&lt;-- Grounded 1-2 sentence rationale ------------------------|<br>
       |&lt;-- JSON Explanation-|                    |                    |                   |
                </div>
                <div class="figure-caption">Figure 3.3: Sequence Diagram for Hybrid Query Execution & Grounded Explanation</div>
            </div>

            <p>
                Notice that query search and detailed explanation generation are decoupled into asynchronous requests.
                This ensures that the search results grid renders immediately (within ~150ms), while the grounded explanation
                is fetched on demand or streamed in the background, maximizing perceived UI responsiveness.
            </p>
        </div>
        <div class="page-footer">(19)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 20
    p = """
    <div class="page" id="page-ch3-6">
        <div class="page-content">
            <h2 class="section-heading">3.6 Data Schema Design & Pydantic Contracts</h2>
            <p>
                To maintain strict data integrity and type safety across network boundaries, all requests and responses
                are governed by immutable Pydantic v2 schemas:
            </p>

            <h3 class="subsection-heading">3.6.1 The <code>VibeSliders</code> Schema</h3>
            <p>
                Encapsulates continuous user mood parameters, enforcing bounding constraints in $[-1.0, +1.0]$:
            </p>
            <ul>
                <li><code>dark_light</code>: Float between -1.0 (Bleak/Grim) and +1.0 (Joyful/Cozy). Defaults to 0.0.</li>
                <li><code>pacing</code>: Float between -1.0 (Fast-paced/Thriller) and +1.0 (Slow-burn/Lyrical). Defaults to 0.0.</li>
                <li><code>cerebral_escapist</code>: Float between -1.0 (Cerebral/Intellectual) and +1.0 (Escapist/Fun). Defaults to 0.0.</li>
                <li><code>length_scale</code>: Float between -1.0 (Short/Compact) and +1.0 (Epic/Tome). Defaults to 0.0.</li>
            </ul>

            <h3 class="subsection-heading">3.6.2 The <code>BookItem</code> Schema</h3>
            <p>
                Represents the comprehensive book entity returned to the frontend presentation layer:
            </p>
            <ul>
                <li><code>isbn13</code> (str) & <code>isbn10</code> (str): Unique bibliographic identifiers.</li>
                <li><code>title</code> (str) & <code>authors</code> (str): Sanitized title and author strings.</li>
                <li><code>categories</code> (str): Canonical category assigned during taxomonic mapping.</li>
                <li><code>average_rating</code> (float) & <code>ratings_count</code> (int): Community validation metrics.</li>
                <li><code>num_pages</code> (int) & <code>published_year</code> (int): Physical and temporal metadata.</li>
                <li><code>emotions</code> (Dict[str, float]): 7-dimensional DistilRoBERTa probability distribution.</li>
                <li><code>vibe_scores</code> (Dict[str, float]): 4-dimensional precomputed vibe vector.</li>
                <li><code>search_score</code>, <code>dense_score</code>, <code>bm25_score</code>: Transparent ranking metrics.</li>
                <li><code>matched_snippet</code> (str): Extracted description sentence answering the user query.</li>
                <li><code>ranking_explanation</code> (Dict[str, Any]): Breakdown of RRF and vibe adjustments.</li>
            </ul>
        </div>
        <div class="page-footer">(20)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 21
    p = """
    <div class="page" id="page-ch3-7">
        <div class="page-content">
            <h2 class="section-heading">3.7 Client-Server Communication Protocol</h2>
            <p>
                Communication between the Next.js frontend and the FastAPI backend occurs over standard HTTP/1.1 and HTTP/2
                using standardized JSON payloads. Table 3.1 details the RESTful contract specifications.
            </p>

            <div class="table-caption">Table 3.1: RESTful API Endpoint Specifications & Status Codes</div>
            <table class="academic-table" style="font-size: 9.5pt;">
                <thead>
                    <tr>
                        <th style="width: 15%;">HTTP Method</th>
                        <th style="width: 25%;">Endpoint Path</th>
                        <th style="width: 35%;">Request Payload / Parameters</th>
                        <th style="width: 25%;">Response Object</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>POST</code></td>
                        <td><code>/api/search</code></td>
                        <td><code>SearchRequest</code> (query, filters, sliders, limit)</td>
                        <td><code>SearchResponse</code> (items, total, query)</td>
                    </tr>
                    <tr>
                        <td><code>POST</code></td>
                        <td><code>/api/similar</code></td>
                        <td><code>SimilarRequest</code> (isbn13s, ratings, mode, modifier)</td>
                        <td><code>SimilarResponse</code> (items, source_titles)</td>
                    </tr>
                    <tr>
                        <td><code>POST</code></td>
                        <td><code>/api/explain</code></td>
                        <td><code>ExplainRequest</code> (isbn13, query)</td>
                        <td><code>ExplainResponse</code> (explanation, snippet)</td>
                    </tr>
                    <tr>
                        <td><code>POST</code></td>
                        <td><code>/api/chat</code></td>
                        <td><code>ChatRequest</code> (messages, current_state)</td>
                        <td><code>ChatResponse</code> (reply, state_updates)</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/api/book/{isbn}</code></td>
                        <td>Path variable <code>isbn13</code></td>
                        <td><code>BookItem</code> detailed record</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/api/galaxy</code></td>
                        <td>None</td>
                        <td>List of <code>GalaxyNode</code> objects</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/api/health</code></td>
                        <td>None</td>
                        <td>Status, book count, index state</td>
                    </tr>
                </tbody>
            </table>

            <p>
                All endpoints emit standard HTTP status codes: <code>200 OK</code> for successful executions, <code>422 Unprocessable Entity</code>
                for schema validation failures (automatically handled by Pydantic), and <code>500 Internal Server Error</code> with sanitized error
                diagnostics in the event of unexpected exceptions.
            </p>
        </div>
        <div class="page-footer">(21)</div>
    </div>
    """
    pages.append(p)

    # ARABIC PAGE 22
    p = """
    <div class="page" id="page-ch3-8">
        <div class="page-content">
            <h2 class="section-heading">3.8 Applied Software Engineering Design Patterns</h2>
            <p>
                To maintain high code quality, testability, and architectural maintainability, several classic software engineering
                design patterns are systematically applied throughout the ShelfSense codebase:
            </p>
            <ul>
                <li><strong>Strategy Pattern (Pluggable LLM Providers):</strong> The <code>BaseLLMProvider</code> abstract base class
                defines the interface contract for rationale generation. Both <code>GeminiProvider</code> and <code>OfflineFallbackProvider</code>
                implement this strategy. The system dynamically switches between providers based on API key availability and operational health.</li>
                <li><strong>Factory Pattern (Model & Client Instantiation):</strong> In <code>scripts/build_index.py</code> and <code>retrieval.py</code>,
                embedding models, ChromaDB persistent clients, and BM25 tokenizers are instantiated through factory methods that enforce
                proper configuration parameters, caching directories, and device placement.</li>
                <li><strong>Dependency Injection Pattern:</strong> In <code>backend/app/services/dependencies.py</code>, FastAPI&rsquo;s
                <code>Depends</code> framework injects initialized service singletons directly into route controllers. This completely
                eliminates global state hazards and makes unit testing straightforward via mock overrides.</li>
                <li><strong>Adapter Pattern (Catalog & Schema Mapping):</strong> During dataset ingestion, raw Goodreads database entities
                and Kaggle CSV rows contain diverse column conventions. Dedicated adapter functions harmonize heterogeneous fields into
                a standardized internal dictionary structure.</li>
                <li><strong>Observer / Reactive State Pattern (Frontend):</strong> In Next.js, state management across Vibe Sliders,
                Reading Shelf, and Search Results utilizes React context providers and reactive state hooks, ensuring immediate UI re-renders
                upon state changes.</li>
            </ul>
        </div>
        <div class="page-footer">(22)</div>
    </div>
    """
    pages.append(p)

    return pages
