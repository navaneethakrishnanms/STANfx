import os
import base64
import io
from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image

# --- App Configuration ---
app = Flask(__name__)

# Instance path setup
INSTANCE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
os.makedirs(INSTANCE_PATH, exist_ok=True)
app.instance_path = INSTANCE_PATH

app.config['SECRET_KEY'] = 'a-very-secret-key-that-you-should-change'
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(INSTANCE_PATH, 'project.db')}"
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- Database and Login Manager Setup ---
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'


# --- Database Models ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    images = db.relationship('UserImage', backref='owner', lazy=True)
    
    def set_password(self, password): 
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password): 
        return check_password_hash(self.password_hash, password)

class UserImage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# --- Routes ---
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('upload_hub'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists.')
            return redirect(url_for('register'))
        
        new_user = User(username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful! Please log in.')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            flash('Please check your login details and try again.')
            return redirect(url_for('login'))
        
        login_user(user)
        return redirect(url_for('upload_hub'))
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/upload')
@login_required
def upload_hub():
    return render_template('upload_hub.html')

@app.route('/dashboard')
@login_required
def dashboard():
    user_images = UserImage.query.filter_by(user_id=current_user.id).order_by(UserImage.id.desc()).all()
    return render_template('dashboard.html', images=user_images)

@app.route('/editor')
@login_required
def editor():
    # This now uses editor1/templates/editor.html (custom editor)
    return render_template('editor.html')

@app.route('/upload_image', methods=['POST'])
@login_required
def upload_image():
    image_data = request.form.get('image_data')
    if not image_data: 
        return 'No image data received', 400
    
    # Split the base64 data
    header, encoded = image_data.split(",", 1)
    image_bytes = base64.b64decode(encoded)
    
    # Generate unique filename
    image_count = UserImage.query.filter_by(user_id=current_user.id).count()
    filename = f"user_{current_user.id}_{image_count + 1}.png"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save the image
    with open(filepath, "wb") as f: 
        f.write(image_bytes)
    
    # Save to database
    new_image = UserImage(filename=filename, user_id=current_user.id)
    db.session.add(new_image)
    db.session.commit()
    
    return redirect(url_for('dashboard'))

@app.route('/uploads/<filename>')
@login_required
def get_uploaded_image(filename):
    # Verify the user owns this image
    image_record = UserImage.query.filter_by(filename=filename, user_id=current_user.id).first_or_404()
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- Run the app ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    # Run the Flask app
    app.run(host="0.0.0.0", port=7860, debug=True)  # Set debug=True for development