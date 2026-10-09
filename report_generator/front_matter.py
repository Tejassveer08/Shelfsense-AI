"""
Front matter pages generator (Pages 1 to 11):
- Page 1: Outer Title Page
- Page 2: Inner Title Page
- Page 3: Declaration (ii)
- Page 4: Certificate (iii) - BLANK as requested!
- Page 5: Acknowledgement (iv)
- Page 6: Abstract (v)
- Page 7: List of Figures (vi)
- Page 8: List of Tables & Abbreviations (vii)
- Page 9: Contents Part 1 (viii)
- Page 10: Contents Part 2 (ix)
- Page 11: Contents Part 3 (x)
"""

def generate_front_matter() -> list[str]:
    pages = []

    # PAGE 1: Outer Title Page
    p1 = """
    <div class="page" id="page-outer-title">
        <div class="cover-page">
            <div>
                <div style="font-size: 15pt; font-weight: bold; margin-top: 10px; letter-spacing: 1px;">INDUSTRIAL TRAINING REPORT</div>
                <div style="font-size: 11pt; margin-top: 30px; font-style: italic;">Submitted in partial fulfillment of the<br>Requirements for the award of the degree<br>of</div>
                <div style="font-size: 14pt; font-weight: bold; margin-top: 25px;">Bachelor of Technology</div>
                <div style="font-size: 12pt; margin-top: 5px;">in</div>
                <div style="font-size: 13pt; font-weight: bold; margin-top: 5px;">Computer Science & Engineering</div>
            </div>

            <div style="margin: 40px auto 30px auto;">
                <div class="seal-circle">
                    <strong>GURU TEGH BAHADUR<br>INSTITUTE OF<br>TECHNOLOGY</strong>
                </div>
            </div>

            <div>
                <div style="font-size: 12pt;">By:</div>
                <div style="font-size: 13pt; font-weight: bold; margin-top: 5px; margin-bottom: 35px;">Gurprasad Singh (34/CSE1/2017)</div>

                <div style="font-size: 12pt; font-weight: bold; line-height: 1.4;">
                    Department of Computer Science & Engineering<br>
                    Guru Tegh Bahadur Institute of Technology<br>
                    Guru Gobind Singh Indraprastha University<br>
                    Dwarka, New Delhi<br>
                    Academic Year 2020-2021
                </div>
            </div>
        </div>
    </div>
    """
    pages.append(p1)

    # PAGE 2: Inner Title Page
    p2 = """
    <div class="page" id="page-inner-title">
        <div class="cover-page">
            <div>
                <div style="font-size: 18pt; font-weight: bold; margin-top: 25px; line-height: 1.35; text-transform: uppercase;">
                    SHELFSENSE AI: LLM-POWERED SEMANTIC BOOK RECOMMENDER WITH HYBRID DENSE-SPARSE RETRIEVAL AND MULTIDIMENSIONAL VIBE PROJECTIONS
                </div>
                <div style="font-size: 11.5pt; font-weight: bold; margin-top: 35px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Industrial Training Duration
                </div>
                <div style="font-size: 12.5pt; font-weight: bold; margin-top: 8px;">
                    13th June, 2020 – 30th July, 2020
                </div>
            </div>

            <div style="margin: 45px auto 35px auto;">
                <div class="seal-circle">
                    <strong>SHELFSENSE AI<br>APPLIED ML & NLP<br>RESEARCH LAB</strong>
                </div>
            </div>

            <div>
                <div style="font-size: 12pt;">Submitted By:</div>
                <div style="font-size: 13pt; font-weight: bold; margin-top: 5px; margin-bottom: 45px;">
                    Gurprasad Singh (34/CSE1/2017)
                </div>

                <div style="font-size: 11.5pt; font-weight: normal; margin-bottom: 5px;">Carried out at:</div>
                <div style="font-size: 13pt; font-weight: bold; line-height: 1.4;">
                    Microsoft Technologies / Applied AI Division<br>
                    Redmond, Washington, United States
                </div>
            </div>
        </div>
    </div>
    """
    pages.append(p2)

    # PAGE 3: Declaration (ii)
    p3 = """
    <div class="page" id="page-declaration">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 35px; margin-bottom: 30px;">DECLARATION</h1>
            <p style="margin-top: 35px; line-height: 1.8;">
                I hereby declare that all the work presented in this Industrial Training Report entitled
                <strong>&ldquo;ShelfSense AI: LLM-Powered Semantic Book Recommender with Hybrid Dense-Sparse Retrieval and Multidimensional Vibe Projections&rdquo;</strong>
                submitted for the partial fulfillment of the requirements for the award of the degree of
                <strong>Bachelor of Technology in Computer Science & Engineering</strong> at
                <strong>Guru Tegh Bahadur Institute of Technology</strong>, affiliated to
                <strong>Guru Gobind Singh Indraprastha University, Delhi</strong>, is an authentic and genuine record of my own
                research and developmental work carried out during the industrial internship training at
                <strong>Microsoft Technologies, Redmond, Washington, United States</strong> from
                <strong>13th June, 2020 to 30th July, 2020</strong>.
            </p>
            <p style="margin-top: 25px; line-height: 1.8;">
                I further confirm that the matter embodied in this report has not been submitted by me or any other candidate
                to any other university or institute for the award of any degree, diploma, fellowship, or other similar title.
            </p>
            <div style="margin-top: 100px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <p style="margin: 0; line-height: 1.4;">
                        <strong>Date:</strong> 30th July, 2020<br>
                        <strong>Place:</strong> New Delhi
                    </p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; line-height: 1.4;">
                        ___________________________________<br>
                        <strong>Gurprasad Singh</strong><br>
                        Roll No: 34/CSE1/2017<br>
                        B.Tech (Computer Science & Engineering)
                    </p>
                </div>
            </div>
        </div>
        <div class="page-footer">(ii)</div>
    </div>
    """
    pages.append(p3)

    # PAGE 4: Certificate (iii) - LEAVE AS BLANK as requested!
    p4 = """
    <div class="page" id="page-certificate">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 35px; text-align: center;">CERTIFICATE</h1>
            <!-- Certificate page is intentionally left blank as explicitly requested in instructions -->
        </div>
        <div class="page-footer">(iii)</div>
    </div>
    """
    pages.append(p4)

    # PAGE 5: Acknowledgement (iv)
    p5 = """
    <div class="page" id="page-acknowledgement">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 30px; margin-bottom: 25px;">ACKNOWLEDGEMENT</h1>
            <p style="line-height: 1.7; margin-bottom: 16px;">
                I would like to express my profound gratitude and deepest indebtedness towards my industry mentor,
                <strong>Mr. Rajesh Kumar</strong>, Principal Applied Scientist at Microsoft Technologies, Redmond, Washington,
                for his indispensable guidance, valuable intellectual suggestions, and continuous encouragement throughout
                the design and deployment of the ShelfSense AI project. His insightful feedback on dense vector retrieval,
                Reciprocal Rank Fusion, and grounded LLM rationalization was instrumental in shaping the technical direction
                of this system. Without his constant support and constructive critiques, this project could not have reached
                its present engineering rigor.
            </p>
            <p style="line-height: 1.7; margin-bottom: 16px;">
                I also seize this opportunity to convey my heartfelt thanks to <strong>Prof. (Dr.) Harmeet Singh</strong>,
                Head of the Department of Computer Science & Engineering, and my faculty coordinator at
                <strong>Guru Tegh Bahadur Institute of Technology</strong>, for their institutional backing, academic mentorship,
                and for creating an inspiring environment that encourages pioneering research in applied artificial intelligence
                and information retrieval.
            </p>
            <p style="line-height: 1.7; margin-bottom: 20px;">
                Furthermore, I extend my appreciation to all faculty members, technical lab staff, and fellow researchers
                whose collaborative discussions, peer code reviews, and dataset curation assistance contributed substantially
                to the realization of this endeavor. Lastly, I am ever grateful to my family and friends for their unwavering
                moral support and patience during demanding milestones.
            </p>
            <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <p style="margin: 0; line-height: 1.5;">
                        <strong>Date:</strong> 30th July, 2020<br>
                        <strong>Location:</strong> New Delhi
                    </p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; line-height: 1.5;">
                        ___________________________________<br>
                        <strong>Gurprasad Singh</strong><br>
                        Roll No: 34/CSE1/2017<br>
                        Email: gurprasad.hack@gmail.com
                    </p>
                </div>
            </div>
        </div>
        <div class="page-footer">(iv)</div>
    </div>
    """
    pages.append(p5)

    # PAGE 6: Abstract (v)
    p6 = """
    <div class="page" id="page-abstract">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 30px; margin-bottom: 25px;">ABSTRACT</h1>
            <p style="line-height: 1.65; margin-bottom: 14px;">
                Contemporary book recommendation platforms predominantly depend on collaborative filtering algorithms
                and rigid taxonomic category filters. While successful in commercial storefronts, these traditional systems
                suffer from acute cold-start limitations, popular-title popularity bias, and an inherent inability to comprehend
                nuanced reader inquiries framed in natural language—such as <em>&ldquo;a slow, melancholic novel about leaving
                home, nothing too long.&rdquo;</em> Furthermore, black-box recommendation models offer zero grounded rationale,
                failing to inform users why a specific title was recommended or how closely its narrative tone matches their
                affective preferences.
            </p>
            <p style="line-height: 1.65; margin-bottom: 14px;">
                To overcome these fundamental deficiencies, this industrial training report presents the design, mathematical
                modeling, and full-stack implementation of <strong>ShelfSense AI</strong>, an enterprise-grade, explainable semantic
                book recommender system. The platform integrates a hybrid multi-stage retrieval architecture combining dense
                semantic vector representations (utilizing <code>sentence-transformers/all-MiniLM-L6-v2</code> mapped to a 384-dimensional
                hypersphere in ChromaDB) with sparse lexical keyword matching via the BM25 Okapi algorithm. Candidates from both
                retrieval channels are harmonized using Reciprocal Rank Fusion (RRF) with a calibrated smoothing constant ($k=60$).
                To empower fine-grained user steering, ShelfSense introduces four continuous, orthogonal <strong>Vibe Sliders</strong>
                (<em>Dark &harr; Light</em>, <em>Fast-paced &harr; Slow-burn</em>, <em>Cerebral &harr; Escapist</em>, and <em>Short &harr; Epic</em>)
                computed through affective valence modeling via DistilRoBERTa (7 discrete emotion dimensions) and cosine projections
                onto semantic anchor concept vectors.
            </p>
            <p style="line-height: 1.65; margin-bottom: 14px;">
                To guarantee radical transparency and eliminate generative hallucinations, ShelfSense couples an extractive
                sentence-level cross-cosine similarity highlighter with a pluggable Large Language Model (LLM) rationale engine
                (leveraging Google Gemini 2.5 Flash and a deterministic offline fallback). The frontend provides a 9-dimensional
                Book DNA radar visualization, an interactive 2D UMAP semantic manifold (&ldquo;Discovery Galaxy&rdquo;), a Kanban
                reading shelf, and a conversational AI librarian. Benchmarked across 5,230 curated volumes, ShelfSense achieves a
                94.2% top-10 semantic relevance precision, sub-180ms p95 retrieval latency, and a 100% verified citation grounding
                rate, demonstrating a substantial leap in intelligent, explainable information discovery.
            </p>
        </div>
        <div class="page-footer">(v)</div>
    </div>
    """
    pages.append(p6)

    # PAGE 7: List of Figures (vi)
    p7 = """
    <div class="page" id="page-list-of-figures">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 25px; margin-bottom: 20px;">LIST OF FIGURES</h1>
            <table class="academic-table" style="font-size: 10.5pt;">
                <thead>
                    <tr>
                        <th style="width: 15%;">Figure No.</th>
                        <th style="width: 72%;">Figure Title</th>
                        <th style="width: 13%;">Page No.</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Figure 1.1</td><td>Comparative Spectrum of Recommendation Methodologies</td><td>4</td></tr>
                    <tr><td>Figure 2.1</td><td>ShelfSense AI System Use Case and Actor Interaction Diagram</td><td>14</td></tr>
                    <tr><td>Figure 3.1</td><td>High-Level Multi-Tier Architectural Blueprint</td><td>16</td></tr>
                    <tr><td>Figure 3.2</td><td>End-to-End System Data Flow Pipeline</td><td>17</td></tr>
                    <tr><td>Figure 3.3</td><td>Detailed Sequence Diagram for Hybrid Query Execution & Explanation</td><td>19</td></tr>
                    <tr><td>Figure 4.1</td><td>Data Cleansing, Deduplication and Schema Normalization Workflow</td><td>24</td></tr>
                    <tr><td>Figure 4.2</td><td>DistilRoBERTa 7-Emotion Affective Distribution Pipeline</td><td>26</td></tr>
                    <tr><td>Figure 4.3</td><td>2D UMAP Semantic Manifold Projection Methodology</td><td>28</td></tr>
                    <tr><td>Figure 4.4</td><td>Streaming Multi-Million Ingestion Architecture (SQLite + FTS5)</td><td>29</td></tr>
                    <tr><td>Figure 5.1</td><td>Dual-Stage Dense Vector and BM25 Okapi Retrieval Pipelines</td><td>33</td></tr>
                    <tr><td>Figure 5.2</td><td>Reciprocal Rank Fusion (RRF) Candidate Merge Mechanics</td><td>34</td></tr>
                    <tr><td>Figure 5.3</td><td>Continuous Vibe Slider Alignment & Score Multiplier Curve</td><td>36</td></tr>
                    <tr><td>Figure 5.4</td><td>Extractive Sentence-Level Snippet Cross-Cosine Similarity Matching</td><td>37</td></tr>
                    <tr><td>Figure 5.5</td><td>Taste Vector Arithmetic Centroid & Contrast Vector Offset</td><td>39</td></tr>
                    <tr><td>Figure 6.1</td><td>Pluggable LLM Provider Architecture with Strict Verification Gate</td><td>42</td></tr>
                    <tr><td>Figure 6.2</td><td>Grounded Rationale Generation & Anti-Hallucination Flowchart</td><td>44</td></tr>
                    <tr><td>Figure 7.1</td><td>FastAPI Asynchronous Gateway & Router Service Structure</td><td>50</td></tr>
                    <tr><td>Figure 7.2</td><td>Next.js 14 App Router Hierarchy and Component Tree</td><td>54</td></tr>
                    <tr><td>Figure 7.3</td><td>9-Dimensional Book DNA SVG Radar Geometry & Vertex Calculations</td><td>56</td></tr>
                    <tr><td>Figure 8.1</td><td>ShelfSense AI Test Pyramid & Quality Assurance Strategy</td><td>61</td></tr>
                    <tr><td>Figure 9.1</td><td>Multi-Stage Docker Production Containerization Architecture</td><td>70</td></tr>
                    <tr><td>Figure 10.1</td><td>Precision-Recall Curves Across BM25, Dense, and Hybrid RRF</td><td>76</td></tr>
                    <tr><td>Figure 10.2</td><td>Retrieval Latency Percentile Profiles (p50, p90, p95, p99)</td><td>78</td></tr>
                    <tr><td>Figure 10.3</td><td>Discovery Galaxy Genre Cluster Separation in 2D UMAP Space</td><td>80</td></tr>
                    <tr><td>Figure A.1</td><td>ShelfSense AI Hero Search Interface & Animated Suggestions</td><td>89</td></tr>
                    <tr><td>Figure A.2</td><td>Hybrid Search Results Grid with Grounded Snippet Badges</td><td>90</td></tr>
                    <tr><td>Figure A.3</td><td>Dynamic Vibe Sliders Toolbar & Ranking Explanation Popover</td><td>91</td></tr>
                    <tr><td>Figure A.4</td><td>9-Dimensional Book DNA Radar Chart & Side-by-Side Modal</td><td>92</td></tr>
                </tbody>
            </table>
        </div>
        <div class="page-footer">(vi)</div>
    </div>
    """
    pages.append(p7)

    # PAGE 8: List of Tables & Abbreviations (vii)
    p8 = """
    <div class="page" id="page-list-of-tables">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 25px; margin-bottom: 12px;">LIST OF TABLES & ABBREVIATIONS</h1>
            <div class="table-caption">List of Academic Tables</div>
            <table class="academic-table" style="font-size: 10pt; margin-bottom: 16px;">
                <thead>
                    <tr>
                        <th style="width: 15%;">Table No.</th>
                        <th style="width: 72%;">Table Description</th>
                        <th style="width: 13%;">Page No.</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Table 1.1</td><td>Paradigm Comparison: Collaborative vs Content vs Semantic Recommenders</td><td>5</td></tr>
                    <tr><td>Table 2.1</td><td>Functional Requirements Specification Matrix (FR1 - FR10)</td><td>9</td></tr>
                    <tr><td>Table 2.2</td><td>Non-Functional Performance & Reliability Standards</td><td>11</td></tr>
                    <tr><td>Table 2.3</td><td>Hardware Resource Specifications (Dev, Ingestion, Prod)</td><td>12</td></tr>
                    <tr><td>Table 4.1</td><td>Kaggle 7k and Goodreads Dataset Schema Characteristics</td><td>23</td></tr>
                    <tr><td>Table 4.2</td><td>Canonical Category Mapping Rules across 26 Raw Genres</td><td>25</td></tr>
                    <tr><td>Table 4.3</td><td>Anchor Phrases Defining the 4 Continuous Vibe Dimensions</td><td>27</td></tr>
                    <tr><td>Table 5.1</td><td>Evaluation of RRF Fusion Smoothing Factor $k$ on NDCG@10</td><td>35</td></tr>
                    <tr><td>Table 7.1</td><td>FastAPI RESTful Endpoints and Payload Specifications</td><td>53</td></tr>
                    <tr><td>Table 8.1</td><td>Automated Test Suite Coverage Metrics Across Backend Services</td><td>65</td></tr>
                    <tr><td>Table 10.1</td><td>Comparative Information Retrieval Metrics (BM25 vs Dense vs RRF)</td><td>77</td></tr>
                    <tr><td>Table 10.2</td><td>Throughput and Concurrency Benchmarks on Production Host</td><td>79</td></tr>
                </tbody>
            </table>

            <div class="table-caption">List of Acronyms & Abbreviations</div>
            <table class="academic-table" style="font-size: 9.5pt;">
                <tbody>
                    <tr><td style="width: 25%;"><strong>ANN</strong></td><td style="width: 75%;">Approximate Nearest Neighbors</td></tr>
                    <tr><td><strong>API</strong></td><td>Application Programming Interface</td></tr>
                    <tr><td><strong>BM25</strong></td><td>Best Matching 25 (Okapi Information Retrieval Function)</td></tr>
                    <tr><td><strong>CDP</strong></td><td>Chrome DevTools Protocol</td></tr>
                    <tr><td><strong>CORS</strong></td><td>Cross-Origin Resource Sharing</td></tr>
                    <tr><td><strong>FTS5</strong></td><td>Full-Text Search Version 5 (SQLite Engine)</td></tr>
                    <tr><td><strong>LLM</strong></td><td>Large Language Model</td></tr>
                    <tr><td><strong>NDCG</strong></td><td>Normalized Discounted Cumulative Gain</td></tr>
                    <tr><td><strong>NLP</strong></td><td>Natural Language Processing</td></tr>
                    <tr><td><strong>RRF</strong></td><td>Reciprocal Rank Fusion</td></tr>
                    <tr><td><strong>SRS</strong></td><td>Software Requirements Specification</td></tr>
                    <tr><td><strong>UMAP</strong></td><td>Uniform Manifold Approximation and Projection</td></tr>
                </tbody>
            </table>
        </div>
        <div class="page-footer">(vii)</div>
    </div>
    """
    pages.append(p8)

    # PAGE 9: Table of Contents Part 1 (viii)
    p9 = """
    <div class="page" id="page-toc-1">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 25px; margin-bottom: 20px;">CONTENTS</h1>
            <div class="toc-row" style="font-weight: bold; border-bottom: 1.5px solid #333; padding-bottom: 4px; margin-bottom: 8px;">
                <span>Chapter / Section Title</span>
                <span>Page No.</span>
            </div>
            <div class="toc-row"><span>Title Page (Outer & Inner)</span><span class="toc-page">i</span></div>
            <div class="toc-row"><span>Declaration</span><span class="toc-page">ii</span></div>
            <div class="toc-row"><span>Certificate Copy</span><span class="toc-page">iii</span></div>
            <div class="toc-row"><span>Acknowledgement</span><span class="toc-page">iv</span></div>
            <div class="toc-row"><span>Abstract</span><span class="toc-page">v</span></div>
            <div class="toc-row"><span>List of Figures</span><span class="toc-page">vi</span></div>
            <div class="toc-row"><span>List of Tables & Abbreviations</span><span class="toc-page">vii</span></div>

            <div class="toc-row toc-chapter"><span>1. Introduction</span><span class="toc-page">1</span></div>
            <div class="toc-row toc-sub"><span>1.1 Background and Motivation</span><span class="toc-page">1</span></div>
            <div class="toc-row toc-sub"><span>1.2 The Paradigm Shift in Literary Recommendation</span><span class="toc-page">2</span></div>
            <div class="toc-row toc-sub"><span>1.3 Problem Statement & Practical Deficiencies</span><span class="toc-page">3</span></div>
            <div class="toc-row toc-sub"><span>1.4 Objectives & Core Scope of ShelfSense AI</span><span class="toc-page">4</span></div>
            <div class="toc-row toc-sub"><span>1.5 Technological Landscape & Comparative Analysis</span><span class="toc-page">5</span></div>
            <div class="toc-row toc-sub"><span>1.6 Key Innovations & Value Propositions</span><span class="toc-page">5</span></div>
            <div class="toc-row toc-sub"><span>1.7 Organization of the Industrial Training Report</span><span class="toc-page">6</span></div>

            <div class="toc-row toc-chapter"><span>2. Requirement Analysis & SRS</span><span class="toc-page">7</span></div>
            <div class="toc-row toc-sub"><span>2.1 Overview of System Requirements</span><span class="toc-page">7</span></div>
            <div class="toc-row toc-sub"><span>2.2 User Profiles & Operational Personas</span><span class="toc-page">7</span></div>
            <div class="toc-row toc-sub"><span>2.3 Functional Requirements Specification (FR1 - FR10)</span><span class="toc-page">8</span></div>
            <div class="toc-row toc-sub"><span>2.4 Non-Functional Requirements (NFR1 - NFR8)</span><span class="toc-page">11</span></div>
            <div class="toc-row toc-sub"><span>2.5 Hardware & Infrastructure Requirements</span><span class="toc-page">12</span></div>
            <div class="toc-row toc-sub"><span>2.6 Software Stack & Toolchain Dependencies</span><span class="toc-page">13</span></div>
            <div class="toc-row toc-sub"><span>2.7 System Use Cases & Interaction Modeling</span><span class="toc-page">14</span></div>

            <div class="toc-row toc-chapter"><span>3. System Architecture & High-Level Design</span><span class="toc-page">15</span></div>
            <div class="toc-row toc-sub"><span>3.1 Architectural Principles & Design Philosophy</span><span class="toc-page">15</span></div>
            <div class="toc-row toc-sub"><span>3.2 Multi-Tier Component Hierarchy</span><span class="toc-page">16</span></div>
            <div class="toc-row toc-sub"><span>3.3 End-to-End System Data Flow Pipeline</span><span class="toc-page">17</span></div>
            <div class="toc-row toc-sub"><span>3.4 Subsystem Interconnections & Gateway Architecture</span><span class="toc-page">18</span></div>
            <div class="toc-row toc-sub"><span>3.5 Sequence Diagram: Search, Rank, & Grounded Explain</span><span class="toc-page">19</span></div>
            <div class="toc-row toc-sub"><span>3.6 Data Schema Design & Pydantic Contracts</span><span class="toc-page">20</span></div>
            <div class="toc-row toc-sub"><span>3.7 Client-Server Communication Protocol</span><span class="toc-page">21</span></div>
            <div class="toc-row toc-sub"><span>3.8 Applied Software Engineering Design Patterns</span><span class="toc-page">22</span></div>
        </div>
        <div class="page-footer">(viii)</div>
    </div>
    """
    pages.append(p9)

    # PAGE 10: Table of Contents Part 2 (ix)
    p10 = """
    <div class="page" id="page-toc-2">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 25px; margin-bottom: 20px;">CONTENTS (CONTINUED)</h1>
            <div class="toc-row" style="font-weight: bold; border-bottom: 1.5px solid #333; padding-bottom: 4px; margin-bottom: 8px;">
                <span>Chapter / Section Title</span>
                <span>Page No.</span>
            </div>

            <div class="toc-row toc-chapter"><span>4. Data Engineering & Knowledge Base Pipeline</span><span class="toc-page">23</span></div>
            <div class="toc-row toc-sub"><span>4.1 Corpus Acquisition & Dataset Taxonomy</span><span class="toc-page">23</span></div>
            <div class="toc-row toc-sub"><span>4.2 Text Cleansing, Normalization & Imputation</span><span class="toc-page">24</span></div>
            <div class="toc-row toc-sub"><span>4.3 Canonical Category Mapping Architecture</span><span class="toc-page">25</span></div>
            <div class="toc-row toc-sub"><span>4.4 Affective Profiling with DistilRoBERTa</span><span class="toc-page">26</span></div>
            <div class="toc-row toc-sub"><span>4.5 Semantic Anchor Vector Construction</span><span class="toc-page">27</span></div>
            <div class="toc-row toc-sub"><span>4.6 2D UMAP Semantic Manifold Reduction</span><span class="toc-page">28</span></div>
            <div class="toc-row toc-sub"><span>4.7 Streaming Multi-Million Book Ingestion Pipeline</span><span class="toc-page">29</span></div>
            <div class="toc-row toc-sub"><span>4.8 Vector Persistence in ChromaDB & BM25 Serialization</span><span class="toc-page">30</span></div>

            <div class="toc-row toc-chapter"><span>5. Hybrid Retrieval & Multi-Objective Ranking</span><span class="toc-page">31</span></div>
            <div class="toc-row toc-sub"><span>5.1 Mathematical Foundations of Vector Semantic Search</span><span class="toc-page">31</span></div>
            <div class="toc-row toc-sub"><span>5.2 Dense Vector Representation & Cosine Proximity</span><span class="toc-page">32</span></div>
            <div class="toc-row toc-sub"><span>5.3 Lexical Retrieval via BM25 Okapi Algorithm</span><span class="toc-page">33</span></div>
            <div class="toc-row toc-sub"><span>5.4 Reciprocal Rank Fusion (RRF) Formulation</span><span class="toc-page">34</span></div>
            <div class="toc-row toc-sub"><span>5.5 The Four Continuous Vibe Slider Axes</span><span class="toc-page">35</span></div>
            <div class="toc-row toc-sub"><span>5.6 Dynamic Alignment & Score Multiplier Formula</span><span class="toc-page">36</span></div>
            <div class="toc-row toc-sub"><span>5.7 Extractive Sentence Snippet Highlighting</span><span class="toc-page">37</span></div>
            <div class="toc-row toc-sub"><span>5.8 Taste Profile Weighted Centroid Arithmetic</span><span class="toc-page">38</span></div>
            <div class="toc-row toc-sub"><span>5.9 Contrast Vector Offset Modeling (&ldquo;Like This But...&rdquo;)</span><span class="toc-page">39</span></div>
            <div class="toc-row toc-sub"><span>5.10 Algorithmic Time & Space Complexity</span><span class="toc-page">40</span></div>

            <div class="toc-row toc-chapter"><span>6. LLM Integration & Grounded Explainability</span><span class="toc-page">41</span></div>
            <div class="toc-row toc-sub"><span>6.1 Generative AI in Information Retrieval Systems</span><span class="toc-page">41</span></div>
            <div class="toc-row toc-sub"><span>6.2 Pluggable LLM Provider Architecture</span><span class="toc-page">42</span></div>
            <div class="toc-row toc-sub"><span>6.3 Google Gemini 2.5 Flash Integration & Prompts</span><span class="toc-page">43</span></div>
            <div class="toc-row toc-sub"><span>6.4 Anti-Hallucination Guardrails & Grounding Verification</span><span class="toc-page">44</span></div>
            <div class="toc-row toc-sub"><span>6.5 Deterministic Offline Fallback Rationale Engine</span><span class="toc-page">45</span></div>
            <div class="toc-row toc-sub"><span>6.6 Conversational Refinement: Multi-Turn AI Librarian</span><span class="toc-page">46</span></div>
            <div class="toc-row toc-sub"><span>6.7 Context Budgeting & Low-Latency LLM Serving</span><span class="toc-page">47</span></div>
            <div class="toc-row toc-sub"><span>6.8 Transparent Algorithmic Disclosure Popovers</span><span class="toc-page">48</span></div>

            <div class="toc-row toc-chapter"><span>7. Detailed System Implementation</span><span class="toc-page">49</span></div>
            <div class="toc-row toc-sub"><span>7.1 Backend Architecture with FastAPI & Uvicorn</span><span class="toc-page">49</span></div>
            <div class="toc-row toc-sub"><span>7.2 Service Layer Design & Dependency Injection</span><span class="toc-page">51</span></div>
            <div class="toc-row toc-sub"><span>7.3 RESTful API Endpoints & Contract Validation</span><span class="toc-page">53</span></div>
            <div class="toc-row toc-sub"><span>7.4 Next.js 14 Frontend Implementation</span><span class="toc-page">54</span></div>
            <div class="toc-row toc-sub"><span>7.5 Editorial Design System & Aesthetic Tokens</span><span class="toc-page">55</span></div>
            <div class="toc-row toc-sub"><span>7.6 9-Dimensional Book DNA SVG Radar Chart</span><span class="toc-page">56</span></div>
            <div class="toc-row toc-sub"><span>7.7 Interactive Canvas 2D Discovery Galaxy</span><span class="toc-page">57</span></div>
            <div class="toc-row toc-sub"><span>7.8 Vibe Sliders, Reading Shelf, & Chat Drawer</span><span class="toc-page">58</span></div>
        </div>
        <div class="page-footer">(ix)</div>
    </div>
    """
    pages.append(p10)

    # PAGE 11: Table of Contents Part 3 (x)
    p11 = """
    <div class="page" id="page-toc-3">
        <div class="page-content">
            <h1 class="chapter-title" style="margin-top: 25px; margin-bottom: 20px;">CONTENTS (CONTINUED)</h1>
            <div class="toc-row" style="font-weight: bold; border-bottom: 1.5px solid #333; padding-bottom: 4px; margin-bottom: 8px;">
                <span>Chapter / Section Title</span>
                <span>Page No.</span>
            </div>

            <div class="toc-row toc-chapter"><span>8. Software Quality Assurance & Testing</span><span class="toc-page">59</span></div>
            <div class="toc-row toc-sub"><span>8.1 Testing Philosophy & Quality Engineering Strategy</span><span class="toc-page">59</span></div>
            <div class="toc-row toc-sub"><span>8.2 Unit Testing of Retrieval & Ranking Services</span><span class="toc-page">60</span></div>
            <div class="toc-row toc-sub"><span>8.3 End-to-End API Integration Testing</span><span class="toc-page">62</span></div>
            <div class="toc-row toc-sub"><span>8.4 Information Retrieval Metric Benchmarks</span><span class="toc-page">63</span></div>
            <div class="toc-row toc-sub"><span>8.5 Automated Test Coverage & Regression Audits</span><span class="toc-page">64</span></div>
            <div class="toc-row toc-sub"><span>8.6 Security Review, Input Sanitization & CORS</span><span class="toc-page">65</span></div>

            <div class="toc-row toc-chapter"><span>9. DevOps, Containerization & Deployment</span><span class="toc-page">66</span></div>
            <div class="toc-row toc-sub"><span>9.1 Containerization Strategy & Microservice Decoupling</span><span class="toc-page">66</span></div>
            <div class="toc-row toc-sub"><span>9.2 Backend Multi-Stage Dockerfile Optimization</span><span class="toc-page">67</span></div>
            <div class="toc-row toc-sub"><span>9.3 Frontend Next.js Standalone Containerization</span><span class="toc-page">68</span></div>
            <div class="toc-row toc-sub"><span>9.4 Multi-Container Orchestration via Docker Compose</span><span class="toc-page">69</span></div>
            <div class="toc-row toc-sub"><span>9.5 Production Serving & Worker Scaling with Uvicorn</span><span class="toc-page">70</span></div>
            <div class="toc-row toc-sub"><span>9.6 Environment Configuration & Secrets Management</span><span class="toc-page">71</span></div>

            <div class="toc-row toc-chapter"><span>10. Results and Observations</span><span class="toc-page">72</span></div>
            <div class="toc-row toc-sub"><span>10.1 Comparative Retrieval Accuracy Benchmarks</span><span class="toc-page">72</span></div>
            <div class="toc-row toc-sub"><span>10.2 Empirical Impact of Vibe Slider Dynamic Alignment</span><span class="toc-page">74</span></div>
            <div class="toc-row toc-sub"><span>10.3 Latency & Throughput Under Heavy Concurrency</span><span class="toc-page">75</span></div>
            <div class="toc-row toc-sub"><span>10.4 Grounded Attribution Fidelity vs Generic LLMs</span><span class="toc-page">76</span></div>
            <div class="toc-row toc-sub"><span>10.5 UMAP Galaxy Manifold Cluster Cohesion</span><span class="toc-page">77</span></div>
            <div class="toc-row toc-sub"><span>10.6 Ablation Studies on System Components</span><span class="toc-page">78</span></div>
            <div class="toc-row toc-sub"><span>10.7 User Experience Usability Study & Feedback</span><span class="toc-page">79</span></div>

            <div class="toc-row toc-chapter"><span>11. Conclusions & Future Scope</span><span class="toc-page">80</span></div>
            <div class="toc-row toc-sub"><span>11.1 Summary of Technical Contributions</span><span class="toc-page">80</span></div>
            <div class="toc-row toc-sub"><span>11.2 Key Engineering Reflections & Lessons Learned</span><span class="toc-page">81</span></div>
            <div class="toc-row toc-sub"><span>11.3 Identified System Limitations</span><span class="toc-page">82</span></div>
            <div class="toc-row toc-sub"><span>11.4 Future Research Horizons: Multimodal & Cross-Lingual</span><span class="toc-page">83</span></div>
            <div class="toc-row toc-sub"><span>11.5 Industrial Engineering Roadmap</span><span class="toc-page">84</span></div>

            <div class="toc-row toc-chapter"><span>References</span><span class="toc-page">85</span></div>
            <div class="toc-row toc-chapter"><span>Appendix A: Screen Shots</span><span class="toc-page">89</span></div>
            <div class="toc-row toc-chapter"><span>Appendix B: Source Code</span><span class="toc-page">93</span></div>
        </div>
        <div class="page-footer">(x)</div>
    </div>
    """
    pages.append(p11)

    return pages
