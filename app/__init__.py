from flask import Flask
from .star_map_blueprint import star_map_bp, db

def create_app(*args, **kw):
    app = Flask(__name__, *args, **kw)

    # Configure SQLite database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////config/starmap.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'your-secret-key-here'

    # Initialize database with app
    db.init_app(app)

    # Register blueprint
    app.register_blueprint(star_map_bp)

    # Create tables
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    create_app().run(debug=True)