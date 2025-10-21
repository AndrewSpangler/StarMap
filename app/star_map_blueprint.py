from flask import Blueprint, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize blueprint
star_map_bp = Blueprint('star_map', __name__)

# Database will be initialized in main app
db = SQLAlchemy()

class StarPoint(db.Model):
    """Model for storing star points on the map"""
    id = db.Column(db.Integer, primary_key=True)
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'name': self.name,
            'details': self.details
        }

@star_map_bp.route('/')
def index():
    """Main endpoint - renders the star map page"""
    return render_template('starmap.html')

@star_map_bp.route('/api/points', methods=['GET', 'POST', 'PUT', 'DELETE'])
def handle_points():
    """Submit endpoint for CRUD operations on star points"""
    
    if request.method == 'GET':
        # Retrieve all points
        points = StarPoint.query.all()
        return jsonify([point.to_dict() for point in points])
    
    elif request.method == 'POST':
        # Create new point
        data = request.get_json()
        new_point = StarPoint(
            x=data['x'],
            y=data['y'],
            name=data.get('name', 'Unnamed Star'),
            details=data.get('details', '')
        )
        db.session.add(new_point)
        db.session.commit()
        return jsonify(new_point.to_dict()), 201
    
    elif request.method == 'PUT':
        # Update existing point
        data = request.get_json()
        point = StarPoint.query.get(data['id'])
        if not point:
            return jsonify({'error': 'Point not found'}), 404
        
        point.name = data.get('name', point.name)
        point.details = data.get('details', point.details)
        db.session.commit()
        return jsonify(point.to_dict())
    
    elif request.method == 'DELETE':
        # Delete point
        data = request.get_json()
        point = StarPoint.query.get(data['id'])
        if not point:
            return jsonify({'error': 'Point not found'}), 404
        
        db.session.delete(point)
        db.session.commit()
        return jsonify({'success': True})