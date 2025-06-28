import React, { useRef, useState, useEffect } from 'react';
import { Alert, StyleSheet, View, TouchableWithoutFeedback, Keyboard, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import Canvas, { CanvasRef } from '../components/Canvas';
import ToolBar from '../components/ToolBar';
import useCanvasElements from '../hooks/useCanvasElements';
import { TextElement, ImageElement, ShapeElement } from '../types';

const EditorScreen: React.FC = () => {
  const canvasRef = useRef<CanvasRef>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Add state to track canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  
  const {
    elements,
    selectedElementId,
    setSelectedElementId,
    addElement,
    updateElement,
    removeElement,
  } = useCanvasElements();

  // Get the center position of the canvas
  const getCenterPosition = () => {
    // If canvas dimensions aren't set yet, use fallback values
    if (canvasDimensions.width === 0 || canvasDimensions.height === 0) {
      // Estimate canvas size from screen dimensions, accounting for margins
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      return {
        x: screenWidth / 2 - 100, // 100 is half the width of element (200)
        y: screenHeight / 3 - 25, // Approximate position, placed in upper third
      };
    }
    
    // Use actual canvas dimensions if available
    return {
      x: canvasDimensions.width / 2 - 100, // Center X, accounting for element width (200)
      y: canvasDimensions.height / 2 - 25, // Center Y, accounting for element height
    };
  };

  const handleAddText = () => {
    try {
      if (isProcessing) return;
      
      // Get the center position
      const center = getCenterPosition();
      
      // Create a new text element centered in the canvas
      const newText: TextElement = {
        id: Date.now().toString(),
        type: 'text' as const,
        text: 'Tap to edit',
        x: center.x,
        y: center.y,
        width: 200,
        height: 50,
        rotation: 0,
        scale: 1,
        fontSize: 24,
        fontFamily: 'System',
        fontStyle: 'normal',
        color: '#000000'
      };
      addElement(newText);
    } catch (error) {
      console.error("Error adding text:", error);
      Alert.alert("Error", "Failed to add text element");
    }
  };

  const handleAddImage = (uri: string) => {
    try {
      if (isProcessing) return;
      if (!uri) {
        console.warn("No image URI provided");
        return;
      }
      
      // Get the center position
      const center = getCenterPosition();
      
      // Create a new image element centered in the canvas
      const newImage: ImageElement = {
        id: Date.now().toString(),
        type: 'image' as const,
        uri,
        x: center.x,
        y: center.y,
        width: 200,
        height: 200,
        rotation: 0,
        scale: 1,
      };
      addElement(newImage);
    } catch (error) {
      console.error("Error adding image:", error);
      Alert.alert("Error", "Failed to add image element");
    }
  };

  const handleAddShape = (shapeType: 'circle' | 'triangle' | 'star') => {
    try {
      if (isProcessing) return;
      
      // Get the center position
      const center = getCenterPosition();
      
      // Create a new shape element centered in the canvas
      const newShape: ShapeElement = {
        id: Date.now().toString(),
        type: 'shape' as const,
        shapeType,
        x: center.x,
        y: center.y,
        width: 150,
        height: 150,
        rotation: 0,
        scale: 1,
        color: getRandomColor()
      };
      addElement(newShape);
    } catch (error) {
      console.error("Error adding shape:", error);
      Alert.alert("Error", "Failed to add shape element");
    }
  };
  
  // Helper function to generate random colors for shapes
  const getRandomColor = () => {
    const colors = [
      '#FF5733', // Red-Orange
      '#33FF57', // Green
      '#3357FF', // Blue
      '#FF33A8', // Pink
      '#33FFF6', // Cyan
      '#F6FF33', // Yellow
      '#C233FF', // Purple
      '#FF8333', // Orange
      '#33FFB8', // Teal
      '#A0FF33', // Lime
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSaveCanvas = async () => {
    try {
      if (isProcessing) return;
      setIsProcessing(true);
      
      // Dismiss keyboard and wait for UI to update
      Keyboard.dismiss();
      console.log("Waiting for UI to update...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log("Requesting media library permissions...");
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save the image.');
        setIsProcessing(false);
        return;
      }
      
      console.log("Permissions granted, capturing canvas...");
      if (!canvasRef.current) {
        throw new Error("Canvas reference is not available");
      }
      
      // Capture the canvas
      console.log("Capturing canvas...");
      const uri = await canvasRef.current.capture();
      console.log("Canvas captured with URI:", uri ? (uri.substring(0, 30) + "...") : "null");
      
      if (!uri) {
        throw new Error("Failed to capture canvas - URI is empty");
      }
      
      // Save to media library
      console.log("Saving to gallery...");
      const asset = await MediaLibrary.saveToLibraryAsync(uri);
      console.log("Saved to gallery successfully");
      
      Alert.alert('Success', 'Design saved to gallery!');
      
    } catch (error: any) {
      console.error('Error saving canvas:', error);
      Alert.alert('Error', `Failed to save the design: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCanvasPress = () => {
    // Dismiss keyboard and deselect elements when canvas is pressed
    console.log("Canvas background pressed, clearing selection");
    Keyboard.dismiss();
    setSelectedElementId(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Remove the TouchableWithoutFeedback to avoid accidental deselections */}
      <View style={styles.container}>
        <Canvas
          ref={canvasRef}
          elements={elements}
          selectedElementId={selectedElementId}
          onElementSelect={setSelectedElementId}
          onElementUpdate={updateElement}
          // Pass the canvas dimensions to the Canvas component
          onCanvasLayout={(width, height) => setCanvasDimensions({ width, height })}
        />
        <ToolBar
          onAddText={handleAddText}
          onAddImage={handleAddImage}
          onAddShape={(shapeType) => handleAddShape(shapeType)}
          onSaveCanvas={handleSaveCanvas}
        />
        
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#0078ff" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
});

export default EditorScreen;