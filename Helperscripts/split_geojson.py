"""
GeoJSON to CSV Converter

This script converts GeoJSON files to CSV format, extracting only the ID and geometry information.
The script processes GeoJSON FeatureCollection files and outputs a CSV with the following columns:
- ID: The feature ID from the GeoJSON
- Geometry_Type: The type of geometry (e.g., Polygon, Point, etc.)
- Coordinates: The coordinate array as a JSON string

Usage:
    python split_geojson.py [input_file] [output_file]
    
    If no arguments provided, uses 'Test.json' as input and 'geojson_split.csv' as output.
    If only input file provided, generates output filename automatically.

Author: GitHub Copilot
"""

import json
import csv
import sys
import os

def split_geojson_to_csv(input_file, output_file):
    """
    Split GeoJSON file into CSV with ID and geometry information
    """
    try:
        # Read the GeoJSON file
        with open(input_file, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        # Open CSV file for writing
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow(['ID', 'Geometry_Type', 'Coordinates'])
            
            # Process each feature
            features = geojson_data.get('features', [])
            
            for feature in features:
                feature_id = feature.get('id', 'N/A')
                geometry = feature.get('geometry', {})
                
                geometry_type = geometry.get('type', 'N/A')
                coordinates = geometry.get('coordinates', [])
                
                # Convert coordinates to string for CSV
                coordinates_str = json.dumps(coordinates) if coordinates else 'N/A'
                
                # Write row to CSV
                writer.writerow([feature_id, geometry_type, coordinates_str])
        
        print(f"Successfully converted {len(features)} features to CSV")
        print(f"Output file: {output_file}")
        
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found")
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in '{input_file}'")
    except Exception as e:
        print(f"Error: {str(e)}")

def main():
    # Default file paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_input = os.path.join(script_dir, 'Test.json')
    default_output = os.path.join(script_dir, 'geojson_split.csv')
    
    # Check if input file is provided as command line argument
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        # Generate output filename based on input
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        output_file = os.path.join(os.path.dirname(input_file), f"{base_name}_split.csv")
    else:
        input_file = default_input
        output_file = default_output
    
    # Check if custom output file is provided
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    print(f"Input file: {input_file}")
    print(f"Output file: {output_file}")
    
    # Process the file
    split_geojson_to_csv(input_file, output_file)

if __name__ == "__main__":
    main()
