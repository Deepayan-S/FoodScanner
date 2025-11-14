const videoElement = document.getElementById('video');
const scannerContainer = document.getElementById('scanner-container');
const resultsContainer = document.getElementById('results-container');
const productImage = document.getElementById('product-image');
const productName = document.getElementById('product-name');
const nutriScoreDiv = document.getElementById('nutri-score');
const productIngredients = document.getElementById('product-ingredients');
const productAllergens = document.getElementById('product-allergens');
const scanAgainBtn = document.getElementById('scan-again-btn');
const errorMessageDiv = document.getElementById('error-message');

let codeReader;
let currentStream;

async function initScanner() {
    // Clear any previous error messages
    showError('');

    // Show scanner, hide results
    resultsContainer.style.display = 'none';
    scannerContainer.style.display = 'block';

    if (codeReader) {
        codeReader.reset();
    }
    codeReader = new ZXing.BrowserMultiFormatReader();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment'
            }
        });
        currentStream = stream;
        videoElement.srcObject = stream;
        videoElement.play();

        codeReader.decodeFromVideoStream(videoElement, (result, err) => {
            if (result) {
                console.log('Barcode scanned:', result.getText());
                const barcode = result.getText();
                // Crucially: Stop the scanner and camera tracks
                codeReader.reset();
                currentStream.getTracks().forEach(track => track.stop());
                fetchProductData(barcode);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
                showError('Error scanning barcode.');
                // Stop camera in case of other errors
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
            }
        });

    } catch (err) {
        console.error('Error accessing camera:', err);
        showError('Could not access the camera. Please ensure permissions are granted.');
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
    }
}

async function fetchProductData(barcode) {
    errorMessageDiv.textContent = 'Loading product data...';
    errorMessageDiv.style.display = 'block';
    console.log('Fetching data for barcode:', barcode);

    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status === 0 || !data.product) {
            showError('Product not found for barcode: ' + barcode);
        } else {
            displayProductData(data.product);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showError('Failed to fetch product data. Please check your internet connection.');
    }
}

function displayProductData(product) {
    errorMessageDiv.style.display = 'none'; // Hide loading message
    scannerContainer.style.display = 'none';
    resultsContainer.style.display = 'block';

    // Handle missing image
    if (product.image_front_url) {
        productImage.src = product.image_front_url;
        productImage.style.display = 'block';
    } else {
        productImage.style.display = 'none';
        productImage.src = ''; // Clear previous image
    }

    productName.textContent = product.product_name || 'N/A';
    productIngredients.textContent = 'Ingredients: ' + (product.ingredients_text || 'N/A');
    productAllergens.textContent = 'Allergens: ' + (product.allergens_from_ingredients || 'None');

    // Handle Nutri-Score
    const nutriScore = product.nutriscore_grade ? product.nutriscore_grade.toLowerCase() : null;
    nutriScoreDiv.className = ''; // Clear existing classes
    if (nutriScore && ['a', 'b', 'c', 'd', 'e'].includes(nutriScore)) {
        nutriScoreDiv.textContent = `Nutri-Score: ${nutriScore.toUpperCase()}`;
        nutriScoreDiv.classList.add(`nutri-${nutriScore}`);
    } else {
        nutriScoreDiv.textContent = 'Nutri-Score: N/A';
    }
}

function showError(message) {
    if (message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        scannerContainer.style.display = 'none';
        resultsContainer.style.display = 'block';

        productImage.style.display = 'none';
        productName.textContent = '';
        nutriScoreDiv.textContent = '';
        nutriScoreDiv.className = '';
        productIngredients.textContent = '';
        productAllergens.textContent = '';

    } else {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    }
}

// Event Listeners
scanAgainBtn.addEventListener('click', () => {
    console.log('Scan Again button clicked');
    initScanner();
});

// Initialize scanner on page load
window.addEventListener('load', initScanner);
