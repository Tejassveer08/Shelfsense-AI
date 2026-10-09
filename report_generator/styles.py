"""
Styles for ShelfSense AI Industrial Training Report.
Conforms strictly to institutional guidelines:
- A4 page dimensions (210mm x 297mm)
- Left margin: 3.5 cm (35mm)
- Right margin: 3.0 cm (30mm)
- Top margin: 2.54 cm / 1 inch (25.4mm)
- Bottom margin: 2.54 cm / 1 inch (25.4mm)
- Normal body text: 12pt, Times New Roman, 1.5 line spacing, single-side writing
- Paragraph headings: 14pt, Times New Roman, Bold
- Source code: 10pt, Times New Roman / Monospace, 1.0 line spacing
"""

CSS_STYLES = """
@page {
    size: A4 portrait;
    margin: 0;
}

* {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

body {
    margin: 0;
    padding: 0;
    font-family: 'Times New Roman', Times, serif;
    background-color: #f0f0f0;
    color: #111111;
}

.report-container {
    width: 210mm;
    margin: 0 auto;
}

.page {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    page-break-after: always;
    page-break-inside: avoid;
    padding: 25.4mm 30.0mm 25.4mm 35.0mm;
    position: relative;
    background-color: #ffffff;
    box-sizing: border-box;
}

.page-content {
    height: 236mm;
    overflow: hidden;
    position: relative;
    font-size: 12pt;
    line-height: 1.5;
    text-align: justify;
    font-family: 'Times New Roman', Times, serif;
}

.page-footer {
    position: absolute;
    bottom: 12mm;
    left: 35.0mm;
    right: 30.0mm;
    text-align: center;
    font-size: 12pt;
    font-family: 'Times New Roman', Times, serif;
    color: #111111;
}

/* Headings */
h1.chapter-title {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    margin-top: 0;
    margin-bottom: 8px;
    line-height: 1.3;
}

h2.chapter-subtitle {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin-top: 0;
    margin-bottom: 22px;
    border-bottom: 1.5px solid #222222;
    padding-bottom: 8px;
}

h2.section-heading {
    font-size: 14pt;
    font-weight: bold;
    margin-top: 14px;
    margin-bottom: 6px;
    line-height: 1.3;
}

h3.subsection-heading {
    font-size: 13pt;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 4px;
    line-height: 1.3;
}

p {
    margin-top: 0;
    margin-bottom: 10px;
    text-indent: 0;
    line-height: 1.5;
    font-size: 12pt;
}

p.first-para {
    text-indent: 0;
}

/* Lists */
ul, ol {
    margin-top: 4px;
    margin-bottom: 10px;
    padding-left: 28px;
}

li {
    margin-bottom: 4px;
    line-height: 1.45;
    font-size: 12pt;
}

/* Tables */
table.academic-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    margin-bottom: 12px;
    font-size: 10.5pt;
    line-height: 1.3;
}

table.academic-table th, table.academic-table td {
    border: 1px solid #333333;
    padding: 5px 8px;
    text-align: left;
}

table.academic-table th {
    background-color: #f2f2f2;
    font-weight: bold;
    text-align: center;
}

.table-caption {
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 4px;
    text-align: left;
}

/* Figures */
.figure-container {
    margin-top: 8px;
    margin-bottom: 12px;
    text-align: center;
}

.figure-box {
    border: 1px solid #777777;
    background-color: #fafafa;
    padding: 10px;
    margin-bottom: 4px;
}

.figure-caption {
    font-size: 11pt;
    font-weight: bold;
    margin-top: 4px;
    text-align: center;
}

/* Math equations */
.equation-box {
    text-align: center;
    margin: 8px 0;
    padding: 6px;
    background-color: #fbfbfb;
    border-left: 3px solid #444444;
    font-style: italic;
    font-size: 11.5pt;
}

.equation-number {
    float: right;
    font-style: normal;
    font-weight: bold;
}

/* Code Listings for Appendix B */
.code-block {
    font-family: 'Times New Roman', monospace;
    font-size: 10pt;
    line-height: 1.0;
    background-color: #fbfbfb;
    border: 1px solid #cccccc;
    padding: 8px;
    white-space: pre;
    overflow: hidden;
    margin-top: 6px;
    margin-bottom: 8px;
    tab-size: 4;
}

.code-title {
    font-size: 10.5pt;
    font-weight: bold;
    margin-bottom: 3px;
}

/* Cover page specific styles */
.cover-page {
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
}

.cover-title {
    font-size: 20pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 15px;
    margin-bottom: 25px;
    line-height: 1.3;
}

.cover-subtitle {
    font-size: 13pt;
    font-style: italic;
    margin-bottom: 15px;
    line-height: 1.4;
}

.cover-degree {
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 25px;
}

.cover-by {
    font-size: 12pt;
    margin-bottom: 8px;
}

.cover-candidate {
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 35px;
}

.cover-dept {
    font-size: 13pt;
    font-weight: bold;
    line-height: 1.4;
    margin-bottom: 15px;
}

.seal-circle {
    width: 140px;
    height: 140px;
    margin: 15px auto;
    border: 2px dashed #666666;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10pt;
    color: #666666;
    text-align: center;
    padding: 10px;
}

/* Table of Contents formatting */
.toc-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 5px;
    font-size: 11.5pt;
    line-height: 1.35;
}

.toc-title {
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
}

.toc-title::after {
    content: " ................................................................................................................................";
    color: #777777;
}

.toc-page {
    padding-left: 10px;
    font-weight: bold;
    white-space: nowrap;
}

.toc-chapter {
    font-weight: bold;
    margin-top: 6px;
    font-size: 12pt;
}

.toc-sub {
    padding-left: 18px;
    font-weight: normal;
}

.toc-subsub {
    padding-left: 36px;
    font-weight: normal;
    font-size: 11pt;
}

/* Screen Shot presentation */
.screenshot-card {
    border: 1px solid #999999;
    background-color: #f7f9fa;
    border-radius: 4px;
    padding: 12px;
    margin-top: 10px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.screenshot-header {
    background-color: #1e293b;
    color: #ffffff;
    padding: 6px 12px;
    font-size: 11pt;
    font-weight: bold;
    border-radius: 3px 3px 0 0;
    display: flex;
    justify-content: space-between;
}

.screenshot-body {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 14px;
    min-height: 140px;
}
"""
