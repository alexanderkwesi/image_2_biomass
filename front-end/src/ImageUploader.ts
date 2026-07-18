// components/ImageUploader.tsx
import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { uploadImage, validateImage, predictImage, clearImage } from '../actions/imageActions';
import { imageSelectors } from '../reducers/imageReducer';
import { showError, showSuccess } from '../utils/notifications';

const ImageUploader: React.FC = () => {
  const dispatch = useDispatch();
  
  const {
    currentImage,
    uploadProgress,
    isUploading,
    isValidating,
    isPredicting,
    validationResult,
    prediction,
    allowedFormats,
    maxFileSize,
    selectedModel,
    models,
  } = useSelector((state: any) => ({
    currentImage: imageSelectors.getCurrentImage(state),
    uploadProgress: imageSelectors.getUploadProgress(state),
    isUploading: imageSelectors.getIsUploading(state),
    isValidating: imageSelectors.getIsValidating(state),
    isPredicting: imageSelectors.getIsPredicting(state),
    validationResult: imageSelectors.getValidationResult(state),
    prediction: imageSelectors.getPrediction(state),
    allowedFormats: imageSelectors.getAllowedFormats(state),
    maxFileSize: imageSelectors.getMaxFileSize(state),
    selectedModel: imageSelectors.getSelectedModel(state),
    models: imageSelectors.getModels(state),
  }));

  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      // Upload the image
      await dispatch(uploadImage(file));
      
      // Auto-validate after upload
      if (currentImage) {
        await dispatch(validateImage(currentImage.id));
      }
      
      showSuccess('Image uploaded successfully!');
    } catch (error: any) {
      showError(`Upload failed: ${error.message}`);
    }
  }, [dispatch, currentImage]);

  const handlePredict = useCallback(async () => {
    if (!currentImage || !validationResult?.isValid) {
      showError('Please upload and validate an image first');
      return;
    }

    try {
      await dispatch(predictImage({
        imageId: currentImage.id,
        modelId: selectedModel,
      }));
    } catch (error: any) {
      showError(`Prediction failed: ${error.message}`);
    }
  }, [dispatch, currentImage, validationResult, selectedModel]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClear = useCallback(() => {
    dispatch(clearImage());
  }, [dispatch]);

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="image-uploader">
      <div className="upload-section">
        {!currentImage ? (
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              id="file-upload"
              accept={allowedFormats.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              hidden
            />
            <label htmlFor="file-upload" className="upload-label">
              <div className="upload-icon">
                <i className="icon-upload"></i>
              </div>
              <h3>Drag & Drop or Click to Upload</h3>
              <p className="formats">
                Supported formats: {allowedFormats.map(f => f.replace('image/', '.')).join(', ')}
              </p>
              <p className="max-size">
                Max file size: {formatFileSize(maxFileSize)}
              </p>
              <button className="browse-button">
                Browse Files
              </button>
            </label>
          </div>
        ) : (
          <div className="image-preview">
            <div className="preview-header">
              <h3>{currentImage.name}</h3>
              <button onClick={handleClear} className="clear-button">
                <i className="icon-close"></i>
              </button>
            </div>
            
            <div className="preview-content">
              <img 
                src={currentImage.url} 
                alt={currentImage.name}
                className="preview-image"
              />
              
              <div className="image-info">
                <p>Size: {formatFileSize(currentImage.size)}</p>
                <p>Type: {currentImage.type}</p>
                {currentImage.width && currentImage.height && (
                  <p>Dimensions: {currentImage.width} × {currentImage.height}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="progress-text">Uploading... {uploadProgress}%</p>
          </div>
        )}
      </div>

      {currentImage && (
        <div className="processing-section">
          <div className="validation-section">
            <h4>Validation</h4>
            {isValidating ? (
              <div className="validating">
                <div className="spinner"></div>
                <p>Validating image...</p>
              </div>
            ) : validationResult ? (
              <div className={`validation-result ${validationResult.isValid ? 'valid' : 'invalid'}`}>
                {validationResult.isValid ? (
                  <div className="valid">
                    <i className="icon-check"></i>
                    <span>Image is valid</span>
                  </div>
                ) : (
                  <div className="invalid">
                    <i className="icon-warning"></i>
                    <span>Image validation failed</span>
                    {validationResult.issues && (
                      <ul className="issues">
                        {validationResult.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <div className="warnings">
                    <h5>Warnings:</h5>
                    <ul>
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="validate-button"
                onClick={() => dispatch(validateImage(currentImage.id))}
                disabled={isValidating}
              >
                Validate Image
              </button>
            )}
          </div>

          {validationResult?.isValid && (
            <div className="prediction-section">
              <div className="model-selector">
                <label htmlFor="model-select">Select Model:</label>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => dispatch(setSelectedModel(e.target.value))}
                  disabled={isPredicting}
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({(model.accuracy * 100).toFixed(1)}% accuracy)
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="predict-button"
                onClick={handlePredict}
                disabled={isPredicting || !validationResult.isValid}
              >
                {isPredicting ? (
                  <>
                    <div className="spinner"></div>
                    Processing...
                  </>
                ) : (
                  'Run Prediction'
                )}
              </button>

              {prediction && (
                <div className="prediction-results">
                  <h4>Prediction Results</h4>
                  <div className="confidence-badge">
                    Model: {prediction.model} v{prediction.modelVersion}
                  </div>
                  <div className="processing-time">
                    Processing time: {prediction.processingTime}ms
                  </div>
                  
                  <div className="predictions-list">
                    {prediction.predictions.map((pred, index) => (
                      <div key={index} className="prediction-item">
                        <div className="prediction-label">{pred.label}</div>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill"
                            style={{ width: `${pred.confidence * 100}%` }}
                          ></div>
                        </div>
                        <div className="confidence-value">
                          {(pred.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;