# Mini Design Editor App

This is a React Native application that allows users to create designs by adding text and images to a canvas, manipulate them using gestures, and export the final design as an image.

## Features

- Add text to the canvas
- Add images from the gallery
- Move, resize, and rotate elements using gestures
- Export the final design as an image to the device's gallery

## Bonus Features Implemented

- Clean and modular folder structure
- TypeScript implementation
- Multiple text layers support
- Custom shape support (optional)

## How to Run

1. Clone this repository
2. Navigate to the project directory:
   ```
   cd mini-design-editor
   ```

3. Install dependencies:
   ```
   npm install
   ```
   
4. Start the Expo development server:
   ```
   npm start
   ```
   
5. Scan the QR code with the Expo Go app on your iOS or Android device, or press:
   - `a` to open on an Android emulator
   - `i` to open on an iOS simulator
   - `w` to open in a web browser

## Notes

- The app uses Reanimated 2 for smooth animations and gesture handling
- The design can be exported as a PNG image to the device's gallery