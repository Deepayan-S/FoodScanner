const imageInput = document.getElementById('image-input');
const fileLabel = document.getElementById('file-label');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const scanBtn = document.getElementById('scan-btn');
const scannerContainer = document.getElementById('scanner-container');
const resultsContainer = document.getElementById('results-container');
const productImage = document.getElementById('product-image');
const productName = document.getElementById('product-name');
const nutriScoreDiv = document.getElementById('nutri-score');
const productIngredients = document.getElementById('product-ingredients');
const productAllergens = document.getElementById('product-allergens');
const scanAgainBtn = document.getElementById('scan-again-btn');
const errorMessageDiv = document.getElementById('error-message');

const scanHints = new Map();
const supportedFormats = [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.ITF
];
scanHints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, supportedFormats);
scanHints.set(ZXing.DecodeHintType.TRY_HARDER, true);

const nativeDetectorFormats = [
    'ean-13',
    'ean-8',
    'upc-a',
    'upc-e',
    'code-128',
    'code-39',
    'itf',
    'codabar'
];
let barcodeDetector = null;
if ('BarcodeDetector' in window) {
    try {
        barcodeDetector = new BarcodeDetector({ formats: nativeDetectorFormats });
    } catch (err) {
        console.warn('BarcodeDetector init failed:', err);
        barcodeDetector = null;
    }
}

// Handle image file selection
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.style.display = 'block';
            fileLabel.style.display = 'none';
            showError(''); // Clear any previous errors
        };
        reader.readAsDataURL(file);
    }
});

// Handle scan button click
scanBtn.addEventListener('click', async () => {
    if (!imagePreview.src) {
        showError('Please select an image first.');
        return;
    }

    showError(''); // Clear previous errors
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning...';

    try {
        // Wait for image to load
        await new Promise((resolve, reject) => {
            if (imagePreview.complete) {
                resolve();
            } else {
                imagePreview.onload = resolve;
                imagePreview.onerror = reject;
            }
        });

        let barcodeValue = null;
        if (barcodeDetector) {
            barcodeValue = await tryNativeBarcodeDetector(imagePreview);
        }
        if (!barcodeValue) {
            const zxResult = await decodeBarcodeFromImage(imagePreview);
            barcodeValue = zxResult?.getText();
        }

        if (!barcodeValue) {
            throw new Error('No barcode detected. Please ensure the barcode is clear and try again.');
        }

        console.log('Barcode scanned:', barcodeValue);
        await fetchProductData(barcodeValue);
    } catch (err) {
        console.error('Scan error:', err);
        showError(err.message || 'No barcode detected. Please ensure the barcode is clear and try again.');
    } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = 'Scan Barcode';
    }
});

async function fetchProductData(barcode) {
    errorMessageDiv.textContent = 'Loading product data...';
    errorMessageDiv.style.display = 'block';
    scannerContainer.style.display = 'none';
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
        resultsContainer.style.display = 'none';
        scannerContainer.style.display = 'block';

        // Clear product data
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
    // Reset everything
    imageInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
    fileLabel.style.display = 'block';
    resultsContainer.style.display = 'none';
    scannerContainer.style.display = 'block';
    showError('');
});

async function decodeBarcodeFromImage(imgElement) {
    // Try QuaggaJS first (often more reliable for real-world images)
    if (typeof Quagga !== 'undefined') {
        try {
            const result = await tryQuaggaJS(imgElement);
            if (result) {
                return { getText: () => result };
            }
        } catch (err) {
            console.log('QuaggaJS failed, trying ZXing...');
        }
    }

    // Try ZXing BrowserMultiFormatReader's built-in decodeFromImage
    const browserReader = new ZXing.BrowserMultiFormatReader(scanHints);
    
    try {
        const result = await browserReader.decodeFromImage(imgElement);
        if (result) {
            return result;
        }
    } catch (err) {
        console.log('BrowserMultiFormatReader.decodeFromImage failed, trying manual approach...');
    }

    // If that fails, try manual approach with aggressive image enhancement
    const reader = new ZXing.MultiFormatReader();
    reader.setHints(scanHints);

    const attemptAngles = [0, 90, 180, 270];
    
    let lastError = null;

    for (const angle of attemptAngles) {
        const { canvas } = getPreparedCanvas(imgElement, angle);
        
        // Try multiple enhancement levels
        const enhancementLevels = [
            { contrast: 1.5, brightness: 0 },
            { contrast: 2.0, brightness: 10 },
            { contrast: 1.8, brightness: -10 },
            { contrast: 2.5, brightness: 0 }
        ];

        for (const enhancement of enhancementLevels) {
            const enhancedCanvas = enhanceImage(canvas, enhancement.contrast, enhancement.brightness);
            const width = enhancedCanvas.width;
            const height = enhancedCanvas.height;
            const imageData = enhancedCanvas.getContext('2d').getImageData(0, 0, width, height);
            const baseSource = new ZXing.RGBLuminanceSource(imageData.data, width, height);

            // Try both binarization methods
            const binarizers = [
                new ZXing.HybridBinarizer(baseSource),
                new ZXing.GlobalHistogramBinarizer(baseSource)
            ];

            for (const binarizer of binarizers) {
                try {
                    const binaryBitmap = new ZXing.BinaryBitmap(binarizer);
                    const result = reader.decode(binaryBitmap);
                    return result;
                } catch (err) {
                    lastError = err;
                    if (!(err instanceof ZXing.NotFoundException)) {
                        throw err;
                    }
                    reader.reset();
                }
            }
        }
    }

    throw lastError || new ZXing.NotFoundException('No barcode detected in the image.');
}

async function tryQuaggaJS(imgElement) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        ctx.drawImage(imgElement, 0, 0);

        Quagga.decodeSingle(
            {
                decoder: {
                    readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader', 'upc_e_reader']
                },
                locate: true,
                src: canvas.toDataURL()
            },
            (result) => {
                if (result && result.codeResult) {
                    resolve(result.codeResult.code);
                } else {
                    reject(new Error('QuaggaJS: No barcode found'));
                }
            }
        );
    });
}

function enhanceImage(canvas, contrast = 1.5, brightness = 0) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and enhance contrast/brightness
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Convert to grayscale using luminance formula
        let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        // Apply brightness adjustment
        gray = gray + brightness;
        
        // Enhance contrast (stretch the histogram)
        const enhanced = Math.max(0, Math.min(255, ((gray - 128) * contrast) + 128));
        
        data[i] = enhanced;
        data[i + 1] = enhanced;
        data[i + 2] = enhanced;
    }
    
    const enhancedCanvas = document.createElement('canvas');
    enhancedCanvas.width = canvas.width;
    enhancedCanvas.height = canvas.height;
    const enhancedCtx = enhancedCanvas.getContext('2d');
    enhancedCtx.putImageData(imageData, 0, 0);
    
    return enhancedCanvas;
}


function getPreparedCanvas(imgElement, rotationDegrees = 0) {
    // Use larger size for better barcode detection
    const maxDimension = 2000;
    const minDimension = 400;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const naturalWidth = imgElement.naturalWidth || imgElement.width;
    const naturalHeight = imgElement.naturalHeight || imgElement.height;
    
    // Scale up small images, scale down large ones
    const maxNatural = Math.max(naturalWidth, naturalHeight);
    let scale = 1;
    if (maxNatural < minDimension) {
        scale = minDimension / maxNatural; // Upscale small images
    } else if (maxNatural > maxDimension) {
        scale = maxDimension / maxNatural; // Downscale large images
    }
    
    const targetWidth = Math.floor(naturalWidth * scale);
    const targetHeight = Math.floor(naturalHeight * scale);

    if (rotationDegrees === 90 || rotationDegrees === 270) {
        canvas.width = targetHeight;
        canvas.height = targetWidth;
    } else {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }

    // Use image smoothing for better quality
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotationDegrees * Math.PI) / 180);
    context.drawImage(
        imgElement,
        -targetWidth / 2,
        -targetHeight / 2,
        targetWidth,
        targetHeight
    );
    context.restore();

    return { canvas, context };
}

async function tryNativeBarcodeDetector(imgElement) {
    if (!barcodeDetector) return null;
    try {
        let source = imgElement;
        let bitmap = null;
        if (window.createImageBitmap) {
            bitmap = await createImageBitmap(imgElement);
            source = bitmap;
        }
        const detections = await barcodeDetector.detect(source);
        if (bitmap && typeof bitmap.close === 'function') {
            bitmap.close();
        }
        if (detections.length > 0) {
            return detections[0].rawValue;
        }
    } catch (err) {
        console.warn('Native BarcodeDetector failed:', err);
    }
    return null;
}
