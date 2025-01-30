from docx import Document
import os

def merge_documents(document_paths):
    merged_document = Document()

    for doc_path in document_paths:
        document = Document(doc_path)
        # Add the content of the document to the merged document
        for element in document.element.body:
            merged_document.element.body.append(element)

    return merged_document
