# from flask import Flask, render_template, request, jsonify
# import tensorflow as tf
# import numpy as np
# import os
# from tensorflow.keras.preprocessing import image

# app = Flask(__name__)

# UPLOAD_FOLDER = "static/uploads"
# app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# # Load trained model
# model = tf.keras.models.load_model("model/pneumonia_model.h5")

# @app.route("/")
# def home():
#     return render_template("index.html")

# @app.route("/predict", methods=["POST"])
# def predict():
#     file = request.files["file"]
    
#     filepath = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
#     file.save(filepath)

#     img = image.load_img(filepath, target_size=(224,224))
#     img_array = image.img_to_array(img) / 255.0
#     img_array = np.expand_dims(img_array, axis=0)

#     prediction = model.predict(img_array)[0][0]

#     if prediction > 0.5:
#         result = "Pneumonia Detected"
#         confidence = prediction
#     else:
#         result = "Normal"
#         confidence = 1 - prediction

#     return jsonify({
#         "result": result,
#         "confidence": round(float(confidence) * 100, 2)
#     })

# if __name__ == "__main__":
#     app.run(debug=True)

from flask import Flask, request, jsonify, render_template
import numpy as np
import os
from PIL import Image
import io

app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Load Model ───────────────────────────────────────────────────────────────
model = None

def load_model():
    global model
    model_path = os.path.join('model', 'pneumonia_model.h5')
    if os.path.exists(model_path):
        try:
            from tensorflow.keras.models import load_model as keras_load_model
            model = keras_load_model(model_path)
            print("✅ Model loaded successfully.")
        except Exception as e:
            print(f"⚠️  Could not load model: {e}")
    else:
        print("⚠️  No model file found at model/pneumonia_model.h5")

# ─── Preprocess Image ─────────────────────────────────────────────────────────
def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0
    return np.expand_dims(img_array, axis=0)

# ─── Routes ───────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    image_bytes = file.read()

    if model is None:
        # ── Demo mode: return mock result if model not loaded ──
        import random
        demo_confidence = round(random.uniform(72, 97), 1)
        demo_positive   = random.choice([True, False])
        return jsonify({
            'result':     'Pneumonia Detected' if demo_positive else 'Normal',
            'confidence': demo_confidence,
            'note':       'Demo mode — no model loaded'
        })

    try:
        img = preprocess_image(image_bytes)
        prediction = model.predict(img)[0][0]

        # Threshold: >0.5 → Pneumonia
        if prediction > 0.5:
            label      = 'Pneumonia Detected'
            confidence = round(float(prediction) * 100, 1)
        else:
            label      = 'Normal'
            confidence = round((1 - float(prediction)) * 100, 1)

        return jsonify({'result': label, 'confidence': confidence})

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    load_model()
    app.run(debug=True, port=5000)
