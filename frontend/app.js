// frontend/app.js

let documentOrder = [];
let documentPreviews = {}; // To store previews by document path
let loadedPreviews = new Set(); // Set to track loaded previews

document.addEventListener('DOMContentLoaded', () => {
    fetchDocuments();

    document.getElementById('preview-button').addEventListener('click', function() {
        const documentPath = '/path/to/your/document.docx';  // Adjust this as needed
        previewDocument(documentPath);
    });
});

async function fetchDocuments() {
    const response = await fetch('http://localhost:5000/api/get-documents');
    const documentData = await response.json();
    
    const docListDiv = document.getElementById('document-list');
    Object.keys(documentData).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.innerHTML = `<h2>${category}</h2>`;
        
        documentData[category].forEach(doc => {
            const docItem = document.createElement('div');
            docItem.className = 'doc-item';
            
            // Add a checkbox to toggle inclusion
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${category}-${doc}`;
            checkbox.addEventListener('change', (event) => toggleDocumentSelection(event, category, doc));
            
            docItem.innerHTML = `<span>${doc}</span>`;
            docItem.prepend(checkbox);
            
            categoryDiv.appendChild(docItem);
        });
        
        docListDiv.appendChild(categoryDiv);
    });
}

function toggleDocumentSelection(event, category, doc) {
    const documentPath = `/${category}/${doc}`;
    
    if (event.target.checked) {
        documentOrder.push(documentPath);
        // Only request preview if it hasn't been loaded yet
        if (!loadedPreviews.has(documentPath)) {
            previewDocument(documentPath); // Display the preview when the document is selected
            loadedPreviews.add(documentPath); // Mark it as loaded
        }
    } else {
        documentOrder = documentOrder.filter(item => item !== documentPath);
        renderDocumentOrder();
        clearPreview(); // Clear the preview when the document is deselected
        loadedPreviews.delete(documentPath); // Remove it from loadedPreviews
    }
    renderDocumentOrder();
}

function renderDocumentOrder() {
    const orderDiv = document.getElementById('ordered-list');
    orderDiv.innerHTML = ''; // Clear current list
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = ''; // Clear current previews

    documentOrder.forEach(doc => {
        // Create and display the ordered list
        const docItem = document.createElement('div');
        docItem.className = 'ordered-doc-item';
        docItem.innerHTML = `<span>${doc}</span>`;
        orderDiv.appendChild(docItem);

        // Display the preview if not already displayed
        if (!documentPreviews[doc]) {
            // Only fetch preview if not already loaded
            if (!loadedPreviews.has(doc)) {
                previewDocument(doc);
                loadedPreviews.add(doc); // Mark as loaded
            }
        } else {
            // Append the previously stored preview
            previewDiv.appendChild(documentPreviews[doc]);
        }
    });

    // Re-enable drag-and-drop functionality after rendering
    enableDragAndDrop();
}

async function previewDocument(documentPath) {
    try {
        const response = await fetch(`http://localhost:5000/api/get-document-preview-pdf?path=${documentPath}`);
        
        if (!response.ok) {
            console.error('Failed to load document preview');
            return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const iframe = document.getElementById('pdf-preview');

        // Ensure iframe exists
        if (iframe) {
            iframe.src = url;
        } else {
            console.error('Preview iframe not found');
        }
    } catch (error) {
        console.error('Error fetching document preview:', error);
    }
}




function clearDocumentPreview(documentPath) {
    const previewContent = documentPreviews[documentPath];
    if (previewContent) {
        // Remove the preview for this specific document
        previewContent.remove();
        
        // Delete from the stored previews object
        delete documentPreviews[documentPath];
    }
}

function clearPreview() {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = ''; // Clear the entire preview area (for debugging purposes if needed)
}

async function mergeDocuments() {
    const response = await fetch('http://localhost:5000/api/merge-documents', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ document_order: documentOrder })
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged_document.docx';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function enableDragAndDrop() {
    const orderDiv = document.getElementById('ordered-list');
    
    // If Sortable instance already exists, destroy it before re-initializing
    if (orderDiv._sortable) {
        orderDiv._sortable.destroy();
    }

    const sortable = new Sortable(orderDiv, {
        onEnd(evt) {
            // Update document order when the list is reordered
            const orderedDocs = Array.from(orderDiv.children).map(item => item.querySelector('span').innerText);
            documentOrder = orderedDocs;

            // Re-render both the ordered list and the previews in the new order
            renderDocumentOrder();
        }
    });

    // Store the Sortable instance for future reference
    orderDiv._sortable = sortable;
}


