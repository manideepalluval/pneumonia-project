import tensorflow as tf
from tensorflow.keras import layers, models
import os

# ==============================
# 1. Dataset Paths
# ==============================

train_dir = "chest_xray/train"
val_dir = "chest_xray/val"
test_dir = "chest_xray/test"

# ==============================
# 2. Load Dataset
# ==============================

train_ds = tf.keras.preprocessing.image_dataset_from_directory(
    train_dir,
    image_size=(224, 224),
    batch_size=32
)

val_ds = tf.keras.preprocessing.image_dataset_from_directory(
    val_dir,
    image_size=(224, 224),
    batch_size=32
)

test_ds = tf.keras.preprocessing.image_dataset_from_directory(
    test_dir,
    image_size=(224, 224),
    batch_size=32
)

# Improve performance
AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.prefetch(buffer_size=AUTOTUNE)
val_ds = val_ds.prefetch(buffer_size=AUTOTUNE)

# ==============================
# 3. Build CNN Model
# ==============================

model = models.Sequential([
    layers.Rescaling(1./255, input_shape=(224,224,3)),

    layers.Conv2D(32, (3,3), activation='relu'),
    layers.MaxPooling2D(),

    layers.Conv2D(64, (3,3), activation='relu'),
    layers.MaxPooling2D(),

    layers.Conv2D(128, (3,3), activation='relu'),
    layers.MaxPooling2D(),

    layers.Flatten(),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.5),

    layers.Dense(1, activation='sigmoid')
])

# ==============================
# 4. Compile Model
# ==============================

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)

# ==============================
# 5. Train Model
# ==============================

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=10
)

# ==============================
# 6. Evaluate Model
# ==============================

test_loss, test_acc = model.evaluate(test_ds)
print("Test Accuracy:", test_acc)

# ==============================
# 7. Save Model
# ==============================

if not os.path.exists("model"):
    os.makedirs("model")

model.save("model/pneumonia_model.h5")

print("Model saved successfully inside model folder!")