# backend/app.py
 
import os
import io
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from document_manager.merge_documents import merge_documents
import mammoth
from docx import Document
import pdfkit

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

DOCUMENT_REPOSITORY_PATH = os.getenv("DOCUMENT_REPOSITORY_PATH")

def convert_docx_to_pdf(doc_path):
    """
    Convert DOCX file to PDF using python-pdfkit and wkhtmltopdf.
    """
    # The conversion to PDF requires html formatting first.
    html_path = os.path.splitext(doc_path)[0] + '.html'
    
    # Convert DOCX to HTML using python-docx (this step creates basic HTML content)
    html_content = docx_to_html(doc_path)
    
    # Write HTML content to the file
    with open(html_path, 'w', encoding='utf-8') as html_file:
        html_file.write(html_content)
    
    # Convert the HTML file to PDF using pdfkit
    pdf_output = os.path.splitext(doc_path)[0] + '.pdf'
    # pdfkit.from_file(html_path, pdf_output)
    pdfkit.from_file(html_path, pdf_output, options={'no-outline': ''})

    
    # Remove the intermediate HTML file
    os.remove(html_path)
    
    return pdf_output

def docx_to_html(doc_path):
    """
    Converts the DOCX file to basic HTML.
    """
    doc = Document(doc_path)
    
    # Start HTML content
    html_content = "<html><head><style>"
    html_content += "body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }"
    html_content += ".para { margin-bottom: 10px; }</style></head><body>"
    
    # Loop through the paragraphs of the DOCX file
    for para in doc.paragraphs:
        html_content += f"<p class='para'>{para.text}</p>"
    
    # Close HTML content
    html_content += "</body></html>"
    
    return html_content



@app.route('/api/get-documents', methods=['GET'])
def get_documents():
    # Get all documents in the repository
    document_structure = {}
    
    # List all categories in the document repo
    for root, dirs, files in os.walk(DOCUMENT_REPOSITORY_PATH):
        category = os.path.basename(root)
        if files:
            document_structure[category] = [f for f in files if f.endswith('.docx')]
    
    return jsonify(document_structure)

@app.route('/api/get-document-preview-pdf', methods=['GET'])
def get_document_preview_pdf():
    document_path = request.args.get('path')
    full_path = os.path.join(DOCUMENT_REPOSITORY_PATH, document_path.lstrip('/'))
    
    if not os.path.exists(full_path):
        return "File not found", 404
    
    # Convert DOCX to PDF
    pdf_file = convert_docx_to_pdf(full_path)
    
    # Send the PDF as a response
    return send_file(pdf_file, as_attachment=True, download_name='document_preview.pdf')

@app.route('/api/merge-documents', methods=['POST'])
def merge_documents_route():
    data = request.json
    document_order = data['document_order']  # List of doc paths
    print("document_order", document_order)
    
    # Generate the merged document in memory
    merged_doc = merge_documents(document_order)
    print("merged_doc", merged_doc)

    # Create a BytesIO buffer to hold the merged document in memory
    merged_doc_buffer = io.BytesIO()
    merged_doc.save(merged_doc_buffer)
    merged_doc_buffer.seek(0)  # Move to the start of the buffer

    # Send the document directly to the client without saving to disk
    return send_file(merged_doc_buffer, as_attachment=True, download_name='merged_document.docx', mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

if __name__ == "__main__":
    app.run(debug=True)

