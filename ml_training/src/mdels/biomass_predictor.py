import tensorflow as tf
from tensorflow.keras import layers, models, backend as K
import numpy as np
import pandas as pd
from typing import Dict, Tuple, List
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_squared_error, r2_score
import xgboost as xgb

class AdvancedBiomassPredictor:
    def __init__(self, config: Dict):
        self.config = config
        self.model = None
        self.feature_scaler = None
        self.target_scaler = None
        self.training_history = None
        
    def build_ensemble_model(self, input_shape: Tuple) -> tf.keras.Model:
        """Build an ensemble-inspired neural network for biomass prediction"""
        
        # Input layer
        inputs = tf.keras.Input(shape=input_shape, name='features_input')
        
        # Multiple feature processing branches
        # Branch 1: Deep feature extraction
        x1 = layers.Dense(512, activation='relu')(inputs)
        x1 = layers.BatchNormalization()(x1)
        x1 = layers.Dropout(0.3)(x1)
        x1 = layers.Dense(256, activation='relu')(x1)
        x1 = layers.Dropout(0.2)(x1)
        
        # Branch 2: Direct connections for important features
        x2 = layers.Dense(128, activation='relu')(inputs)
        x2 = layers.BatchNormalization()(x2)
        
        # Branch 3: Residual connections
        x3 = layers.Dense(256, activation='relu')(inputs)
        x3 = layers.BatchNormalization()(x3)
        x3_res = layers.Dense(128, activation='relu')(x3)
        x3 = layers.Add()([x3, x3_res])
        
        # Concatenate all branches
        concatenated = layers.concatenate([x1, x2, x3])
        
        # Joint processing
        x = layers.Dense(512, activation='relu')(concatenated)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
        
        x = layers.Dense(256, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.2)(x)
        
        x = layers.Dense(128, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        
        # Multiple output layers for different biomass components
        outputs = {
            'Dry_Green_g': layers.Dense(1, activation='linear', name='Dry_Green_g')(x),
            'Dry_Dead_g': layers.Dense(1, activation='linear', name='Dry_Dead_g')(x),
            'Dry_Clover_g': layers.Dense(1, activation='linear', name='Dry_Clover_g')(x),
            'GDM_g': layers.Dense(1, activation='linear', name='GDM_g')(x),
            'Dry_Total_g': layers.Dense(1, activation='linear', name='Dry_Total_g')(x)
        }
        
        model = tf.keras.Model(inputs=inputs, outputs=outputs)
        
        # Custom loss weights based on competition scoring
        loss_weights = {
            'Dry_Green_g': 0.1,
            'Dry_Dead_g': 0.1, 
            'Dry_Clover_g': 0.1,
            'GDM_g': 0.2,
            'Dry_Total_g': 0.5
        }
        
        # Compile model
        model.compile(
            optimizer=tf.keras.optimizers.Adam(
                learning_rate=self.config.get('learning_rate', 0.001)
            ),
            loss='mse',
            loss_weights=loss_weights,
            metrics=['mae', 'mse']
        )
        
        return model
    
    def build_xgboost_model(self):
        """Build XGBoost model for comparison"""
        return MultiOutputRegressor(
            xgb.XGBRegressor(
                n_estimators=1000,
                learning_rate=0.01,
                max_depth=8,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1
            )
        )
    
    def build_random_forest_model(self):
        """Build Random Forest model for comparison"""
        return MultiOutputRegressor(
            RandomForestRegressor(
                n_estimators=500,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        )
    
    def train_neural_network(self, X_train, y_train, X_val, y_val):
        """Train the neural network model"""
        print("Training Neural Network Model...")
        
        # Build model
        self.model = self.build_ensemble_model(input_shape=(X_train.shape[1],))
        
        # Convert targets to dictionary format for multi-output training
        y_train_dict = {
            'Dry_Green_g': y_train[:, 0],
            'Dry_Dead_g': y_train[:, 1],
            'Dry_Clover_g': y_train[:, 2],
            'GDM_g': y_train[:, 3],
            'Dry_Total_g': y_train[:, 4]
        }
        
        y_val_dict = {
            'Dry_Green_g': y_val[:, 0],
            'Dry_Dead_g': y_val[:, 1], 
            'Dry_Clover_g': y_val[:, 2],
            'GDM_g': y_val[:, 3],
            'Dry_Total_g': y_val[:, 4]
        } if y_val is not None else None
        
        # Callbacks
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                patience=self.config.get('early_stopping_patience', 50),
                restore_best_weights=True,
                monitor='val_loss' if y_val is not None else 'loss'
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                factor=0.5,
                patience=20,
                min_lr=1e-7
            ),
            tf.keras.callbacks.ModelCheckpoint(
                'best_model.h5',
                save_best_only=True,
                monitor='val_loss' if y_val is not None else 'loss'
            )
        ]
        
        # Train model
        history = self.model.fit(
            X_train, y_train_dict,
            validation_data=(X_val, y_val_dict) if y_val is not None else None,
            epochs=self.config.get('epochs', 500),
            batch_size=self.config.get('batch_size', 32),
            callbacks=callbacks,
            verbose=1
        )
        
        self.training_history = history.history
        return history
    
    def train_xgboost(self, X_train, y_train, X_val=None, y_val=None):
        """Train XGBoost model"""
        print("Training XGBoost Model...")
        
        self.xgb_model = self.build_xgboost_model()
        
        # Train model
        self.xgb_model.fit(X_train, y_train)
        
        # Early stopping with validation set if provided
        if X_val is not None and y_val is not None:
            self.xgb_model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                early_stopping_rounds=50,
                verbose=False
            )
        
        return self.xgb_model
    
    def train_random_forest(self, X_train, y_train):
        """Train Random Forest model"""
        print("Training Random Forest Model...")
        
        self.rf_model = self.build_random_forest_model()
        self.rf_model.fit(X_train, y_train)
        
        return self.rf_model
    
    def predict(self, X, model_type='neural_network'):
        """Make predictions using specified model"""
        if model_type == 'neural_network' and self.model is not None:
            predictions = self.model.predict(X)
            # Convert dictionary to array
            return np.column_stack([
                predictions['Dry_Green_g'],
                predictions['Dry_Dead_g'],
                predictions['Dry_Clover_g'], 
                predictions['GDM_g'],
                predictions['Dry_Total_g']
            ])
        elif model_type == 'xgboost' and hasattr(self, 'xgb_model'):
            return self.xgb_model.predict(X)
        elif model_type == 'random_forest' and hasattr(self, 'rf_model'):
            return self.rf_model.predict(X)
        else:
            raise ValueError(f"Model {model_type} not trained or available")
    
    def evaluate_competition_metric(self, y_true, y_pred, component_weights=None):
        """Calculate the competition evaluation metric"""
        if component_weights is None:
            component_weights = [0.1, 0.1, 0.1, 0.2, 0.5]
        
        component_names = ['Dry_Green_g', 'Dry_Dead_g', 'Dry_Clover_g', 'GDM_g', 'Dry_Total_g']
        component_scores = {}
        total_score = 0
        
        for i, component in enumerate(component_names):
            y_true_component = y_true[:, i]
            y_pred_component = y_pred[:, i]
            
            # Calculate R² score
            ss_res = np.sum((y_true_component - y_pred_component) ** 2)
            ss_tot = np.sum((y_true_component - np.mean(y_true_component)) ** 2)
            
            if ss_tot == 0:
                r2 = 0
            else:
                r2 = 1 - (ss_res / ss_tot)
            
            component_scores[component] = r2
            total_score += component_weights[i] * r2
        
        return total_score, component_scores
    
    def evaluate_model(self, X_test, y_test, model_type='neural_network'):
        """Comprehensive model evaluation"""
        y_pred = self.predict(X_test, model_type)
        
        # Calculate competition metric
        competition_score, component_scores = self.evaluate_competition_metric(y_test, y_pred)
        
        # Calculate additional metrics
        mse_scores = mean_squared_error(y_test, y_pred, multioutput='raw_values')
        r2_scores = r2_score(y_test, y_pred, multioutput='raw_values')
        
        metrics = {
            'competition_score': competition_score,
            'component_scores': component_scores,
            'mse_per_component': dict(zip(['Dry_Green_g', 'Dry_Dead_g', 'Dry_Clover_g', 'GDM_g', 'Dry_Total_g'], mse_scores)),
            'r2_per_component': dict(zip(['Dry_Green_g', 'Dry_Dead_g', 'Dry_Clover_g', 'GDM_g', 'Dry_Total_g'], r2_scores)),
            'overall_mse': mean_squared_error(y_test, y_pred),
            'overall_r2': r2_score(y_test, y_pred)
        }
        
        return metrics
    
    def create_ensemble_prediction(self, X, weights=None):
        """Create ensemble prediction from all trained models"""
        if weights is None:
            weights = {'neural_network': 0.5, 'xgboost': 0.3, 'random_forest': 0.2}
        
        predictions = {}
        total_weight = 0
        weighted_sum = None
        
        for model_type, weight in weights.items():
            try:
                pred = self.predict(X, model_type)
                predictions[model_type] = pred
                
                if weighted_sum is None:
                    weighted_sum = weight * pred
                else:
                    weighted_sum += weight * pred
                
                total_weight += weight
            except ValueError:
                print(f"Model {model_type} not available for ensemble")
                continue
        
        if weighted_sum is not None:
            return weighted_sum / total_weight, predictions
        else:
            raise ValueError("No models available for ensemble prediction")
    
    def save_model(self, filepath, model_type='neural_network'):
        """Save trained model"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        if model_type == 'neural_network' and self.model is not None:
            self.model.save(f"{filepath}_nn.h5")
        elif model_type == 'xgboost' and hasattr(self, 'xgb_model'):
            joblib.dump(self.xgb_model, f"{filepath}_xgb.pkl")
        elif model_type == 'random_forest' and hasattr(self, 'rf_model'):
            joblib.dump(self.rf_model, f"{filepath}_rf.pkl")
        else:
            raise ValueError(f"Model {model_type} not trained")
        
        print(f"Model saved to {filepath}_{model_type}")
    
    def load_model(self, filepath, model_type='neural_network'):
        """Load trained model"""
        if model_type == 'neural_network':
            self.model = tf.keras.models.load_model(f"{filepath}_nn.h5")
        elif model_type == 'xgboost':
            self.xgb_model = joblib.load(f"{filepath}_xgb.pkl")
        elif model_type == 'random_forest':
            self.rf_model = joblib.load(f"{filepath}_rf.pkl")
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        print(f"Model loaded from {filepath}_{model_type}")