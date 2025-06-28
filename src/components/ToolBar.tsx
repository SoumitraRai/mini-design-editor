import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CanvasElement } from '../types';

interface ToolBarProps {
  onAddText: () => void;
  onAddImage: (uri: string) => void;
  onAddShape: (shapeType: 'circle' | 'triangle' | 'star') => void;
  onSaveCanvas: () => void;
}

const ToolBar: React.FC<ToolBarProps> = ({
  onAddText,
  onAddImage,
  onAddShape,
  onSaveCanvas,
}) => {
  const [shapeModalVisible, setShapeModalVisible] = useState(false);
  
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      onAddImage(pickerResult.assets[0].uri);
    }
  };
  
  const handleAddShape = (shapeType: 'circle' | 'triangle' | 'star') => {
    onAddShape(shapeType);
    setShapeModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onAddText}>
        <Text>Add Text</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text>Add Image</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => setShapeModalVisible(true)}>
        <Text>Add Shape</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onSaveCanvas}>
        <Text>Export</Text>
      </TouchableOpacity>
      
      {/* Shape selector modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shapeModalVisible}
        onRequestClose={() => setShapeModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Shape</Text>
            
            <View style={styles.shapeButtonsContainer}>
              <TouchableOpacity
                style={styles.shapeButton}
                onPress={() => handleAddShape('circle')}
              >
                <View style={styles.circlePreview} />
                <Text>Circle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.shapeButton}
                onPress={() => handleAddShape('triangle')}
              >
                <View style={styles.trianglePreview} />
                <Text>Triangle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.shapeButton}
                onPress={() => handleAddShape('star')}
              >
                <View style={styles.starPreview} />
                <Text>Star</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShapeModalVisible(false)}
            >
              <Text style={styles.textStyle}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
  },
  button: {
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  // Modal styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  shapeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 10,
  },
  shapeButton: {
    padding: 10,
    alignItems: 'center',
    width: '30%',
  },
  circlePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF5733',
    marginBottom: 5,
  },
  trianglePreview: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3357FF',
    marginBottom: 5,
  },
  starPreview: {
    width: 40,
    height: 40,
    backgroundColor: '#F6FF33',
    borderRadius: 5,
    marginBottom: 5,
  },
  closeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    marginTop: 15,
    width: '80%',
    alignItems: 'center',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ToolBar;