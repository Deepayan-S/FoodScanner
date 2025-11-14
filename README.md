# Food Facts Scanner

A web application that scans product barcodes from images and displays nutritional information using the Open Food Facts API.

## Features

- 📸 Upload and scan barcode images
- 🏷️ Display product name, image, ingredients, and allergens
- 📊 Show Nutri-Score with color-coded grades
- 📱 Mobile-responsive design
- ✅ Clear error messages when no barcode is detected

## How to Use

1. Click "Choose Image" to select an image containing a barcode
2. Preview the selected image
3. Click "Scan Barcode" to detect and decode the barcode
4. View product information from Open Food Facts database
5. Click "Scan Again" to scan a new product

## Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Push all files to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```
3. Go to your repository Settings → Pages
4. Under "Source", select "Deploy from a branch"
5. Choose branch: `main` and folder: `/ (root)`
6. Click Save
7. Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- [@zxing/library](https://github.com/zxing-js/library) for barcode scanning
- [Open Food Facts API](https://world.openfoodfacts.org/api)

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is open source and available for educational purposes.

