import os
import struct
import json
import math

def ensure_dir(d):
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

class MeshBuilder:
    def __init__(self):
        self.vertices = []
        self.normals = []
        self.indices = []

    def add_vertex(self, pos, norm):
        idx = len(self.vertices)
        self.vertices.append([float(pos[0]), float(pos[1]), float(pos[2])])
        self.normals.append([float(norm[0]), float(norm[1]), float(norm[2])])
        return idx

    def add_triangle(self, v0, v1, v2):
        self.indices.extend([v0, v1, v2])

    def add_quad(self, v0, v1, v2, v3):
        # v0 -> v1 -> v2 and v0 -> v2 -> v3
        self.indices.extend([v0, v1, v2, v0, v2, v3])

    def add_box(self, x0, y0, z0, x1, y1, z1):
        # 6 faces with proper outward normals
        # Front (+Z)
        n = [0, 0, 1]
        v0 = self.add_vertex([x0, y0, z1], n)
        v1 = self.add_vertex([x1, y0, z1], n)
        v2 = self.add_vertex([x1, y1, z1], n)
        v3 = self.add_vertex([x0, y1, z1], n)
        self.add_quad(v0, v1, v2, v3)

        # Back (-Z)
        n = [0, 0, -1]
        v0 = self.add_vertex([x1, y0, z0], n)
        v1 = self.add_vertex([x0, y0, z0], n)
        v2 = self.add_vertex([x0, y1, z0], n)
        v3 = self.add_vertex([x1, y1, z0], n)
        self.add_quad(v0, v1, v2, v3)

        # Top (+Y)
        n = [0, 1, 0]
        v0 = self.add_vertex([x0, y1, z1], n)
        v1 = self.add_vertex([x1, y1, z1], n)
        v2 = self.add_vertex([x1, y1, z0], n)
        v3 = self.add_vertex([x0, y1, z0], n)
        self.add_quad(v0, v1, v2, v3)

        # Bottom (-Y)
        n = [0, -1, 0]
        v0 = self.add_vertex([x0, y0, z0], n)
        v1 = self.add_vertex([x1, y0, z0], n)
        v2 = self.add_vertex([x1, y0, z1], n)
        v3 = self.add_vertex([x0, y0, z1], n)
        self.add_quad(v0, v1, v2, v3)

        # Right (+X)
        n = [1, 0, 0]
        v0 = self.add_vertex([x1, y0, z1], n)
        v1 = self.add_vertex([x1, y0, z0], n)
        v2 = self.add_vertex([x1, y1, z0], n)
        v3 = self.add_vertex([x1, y1, z1], n)
        self.add_quad(v0, v1, v2, v3)

        # Left (-X)
        n = [-1, 0, 0]
        v0 = self.add_vertex([x0, y0, z0], n)
        v1 = self.add_vertex([x0, y0, z1], n)
        v2 = self.add_vertex([x0, y1, z1], n)
        v3 = self.add_vertex([x0, y1, z0], n)
        self.add_quad(v0, v1, v2, v3)

    def add_cylinder(self, cx, cy, cz, r, h, axis='y', segments=24):
        # Cylinder aligned with axis
        half_h = h / 2.0
        ring1 = []
        ring2 = []
        
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            c = math.cos(angle)
            s = math.sin(angle)
            
            if axis == 'y':
                px = cx + r * c
                pz = cz + r * s
                py1 = cy - half_h
                py2 = cy + half_h
                norm = [c, 0, s]
                ring1.append(self.add_vertex([px, py1, pz], norm))
                ring2.append(self.add_vertex([px, py2, pz], norm))
            elif axis == 'z':
                px = cx + r * c
                py = cy + r * s
                pz1 = cz - half_h
                pz2 = cz + half_h
                norm = [c, s, 0]
                ring1.append(self.add_vertex([px, py, pz1], norm))
                ring2.append(self.add_vertex([px, py, pz2], norm))
            elif axis == 'x':
                py = cy + r * c
                pz = cz + r * s
                px1 = cx - half_h
                px2 = cx + half_h
                norm = [0, c, s]
                ring1.append(self.add_vertex([px1, py, pz], norm))
                ring2.append(self.add_vertex([px2, py, pz], norm))

        # Side quads
        for i in range(segments):
            next_i = (i + 1) % segments
            self.add_quad(ring1[i], ring1[next_i], ring2[next_i], ring2[i])

        # Caps
        if axis == 'y':
            c_top = self.add_vertex([cx, cy + half_h, cz], [0, 1, 0])
            c_bot = self.add_vertex([cx, cy - half_h, cz], [0, -1, 0])
            for i in range(segments):
                next_i = (i + 1) % segments
                v_t1 = self.add_vertex(self.vertices[ring2[i]], [0, 1, 0])
                v_t2 = self.add_vertex(self.vertices[ring2[next_i]], [0, 1, 0])
                self.add_triangle(c_top, v_t1, v_t2)

                v_b1 = self.add_vertex(self.vertices[ring1[i]], [0, -1, 0])
                v_b2 = self.add_vertex(self.vertices[ring1[next_i]], [0, -1, 0])
                self.add_triangle(c_bot, v_b2, v_b1)
        elif axis == 'z':
            c_top = self.add_vertex([cx, cy, cz + half_h], [0, 0, 1])
            c_bot = self.add_vertex([cx, cy, cz - half_h], [0, 0, -1])
            for i in range(segments):
                next_i = (i + 1) % segments
                v_t1 = self.add_vertex(self.vertices[ring2[i]], [0, 0, 1])
                v_t2 = self.add_vertex(self.vertices[ring2[next_i]], [0, 0, 1])
                self.add_triangle(c_top, v_t1, v_t2)

                v_b1 = self.add_vertex(self.vertices[ring1[i]], [0, 0, -1])
                v_b2 = self.add_vertex(self.vertices[ring1[next_i]], [0, 0, -1])
                self.add_triangle(c_bot, v_b2, v_b1)
        elif axis == 'x':
            c_top = self.add_vertex([cx + half_h, cy, cz], [1, 0, 0])
            c_bot = self.add_vertex([cx - half_h, cy, cz], [-1, 0, 0])
            for i in range(segments):
                next_i = (i + 1) % segments
                v_t1 = self.add_vertex(self.vertices[ring2[i]], [1, 0, 0])
                v_t2 = self.add_vertex(self.vertices[ring2[next_i]], [1, 0, 0])
                self.add_triangle(c_top, v_t1, v_t2)

                v_b1 = self.add_vertex(self.vertices[ring1[i]], [-1, 0, 0])
                v_b2 = self.add_vertex(self.vertices[ring1[next_i]], [-1, 0, 0])
                self.add_triangle(c_bot, v_b2, v_b1)

    def add_ring(self, cx, cy, cz, r_out, r_in, h, axis='z', segments=24):
        # Ring / Toroid-like cylinder with a hole
        half_h = h / 2.0
        # Outer cylinder side
        self.add_cylinder(cx, cy, cz, r_out, h, axis=axis, segments=segments)
        
        # Inner cylinder side (inverted normals)
        ring_in1 = []
        ring_in2 = []
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            c = math.cos(angle)
            s = math.sin(angle)
            if axis == 'z':
                px = cx + r_in * c
                py = cy + r_in * s
                pz1 = cz - half_h
                pz2 = cz + half_h
                norm = [-c, -s, 0] # pointing inward
                ring_in1.append(self.add_vertex([px, py, pz1], norm))
                ring_in2.append(self.add_vertex([px, py, pz2], norm))
        for i in range(segments):
            next_i = (i + 1) % segments
            self.add_quad(ring_in1[i], ring_in2[i], ring_in2[next_i], ring_in1[next_i])

    def build_glb(self, name='Model', base_color=[0.25, 0.28, 0.35, 1.0], roughness=0.55, metallic=0.15):
        # Convert to GLB binary
        pos_bytes = bytearray()
        min_pos = [float('inf')]*3
        max_pos = [float('-inf')]*3
        for p in self.vertices:
            pos_bytes += struct.pack('<fff', *p)
            for i in range(3):
                min_pos[i] = min(min_pos[i], p[i])
                max_pos[i] = max(max_pos[i], p[i])
        
        norm_bytes = bytearray()
        for n in self.normals:
            norm_bytes += struct.pack('<fff', *n)
            
        idx_bytes = bytearray()
        min_idx = min(self.indices) if self.indices else 0
        max_idx = max(self.indices) if self.indices else 0
        
        # Use unsigned int or unsigned short based on vertex count
        if len(self.vertices) > 65535:
            component_type = 5125 # UNSIGNED_INT
            for idx in self.indices:
                idx_bytes += struct.pack('<I', idx)
        else:
            component_type = 5123 # UNSIGNED_SHORT
            for idx in self.indices:
                idx_bytes += struct.pack('<H', idx)
                
        while len(idx_bytes) % 4 != 0:
            idx_bytes += b'\x00'

        idx_offset = 0
        idx_len = len(idx_bytes)
        
        pos_offset = idx_offset + idx_len
        pos_len = len(pos_bytes)
        
        norm_offset = pos_offset + pos_len
        norm_len = len(norm_bytes)
        
        bin_data = idx_bytes + pos_bytes + norm_bytes
        while len(bin_data) % 4 != 0:
            bin_data += b'\x00'
            
        gltf = {
            'asset': {
                'version': '2.0',
                'generator': 'PediGochos 3D Lab Studio Generator'
            },
            'scenes': [{'nodes': [0]}],
            'nodes': [{'name': name, 'mesh': 0}],
            'meshes': [{
                'name': name + 'Mesh',
                'primitives': [{
                    'attributes': {'POSITION': 1, 'NORMAL': 2},
                    'indices': 0,
                    'material': 0
                }]
            }],
            'materials': [{
                'name': name + 'Material',
                'pbrMetallicRoughness': {
                    'baseColorFactor': base_color,
                    'metallicFactor': metallic,
                    'roughnessFactor': roughness
                },
                'doubleSided': True
            }],
            'accessors': [
                {'bufferView': 0, 'byteOffset': 0, 'componentType': component_type, 'count': len(self.indices), 'type': 'SCALAR', 'max': [max_idx], 'min': [min_idx]},
                {'bufferView': 1, 'byteOffset': 0, 'componentType': 5126, 'count': len(self.vertices), 'type': 'VEC3', 'max': max_pos, 'min': min_pos},
                {'bufferView': 2, 'byteOffset': 0, 'componentType': 5126, 'count': len(self.normals), 'type': 'VEC3'}
            ],
            'bufferViews': [
                {'buffer': 0, 'byteOffset': idx_offset, 'byteLength': idx_len, 'target': 34963},
                {'buffer': 0, 'byteOffset': pos_offset, 'byteLength': pos_len, 'target': 34962},
                {'buffer': 0, 'byteOffset': norm_offset, 'byteLength': norm_len, 'target': 34962}
            ],
            'buffers': [{'byteLength': len(bin_data)}]
        }
        
        json_bytes = json.dumps(gltf).encode('utf-8')
        while len(json_bytes) % 4 != 0:
            json_bytes += b' '
            
        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
        header = struct.pack('<4sII', b'glTF', 2, total_len)
        chunk0_hdr = struct.pack('<I4s', len(json_bytes), b'JSON')
        chunk1_hdr = struct.pack('<I4s', len(bin_data), b'BIN\x00')
        
        return header + chunk0_hdr + json_bytes + chunk1_hdr + bin_data


def generate_phone_stand():
    builder = MeshBuilder()
    
    # Coordinates in centimeters (scale 1 unit = 1 cm)
    # 1. Base Plate: 7.5cm width (X: -3.75 to 3.75), 8.5cm depth (Z: -4.25 to 4.25), height 0.6cm (Y: 0 to 0.6)
    builder.add_box(-3.75, 0.0, -4.25, 3.75, 0.6, 4.25)
    
    # Beveled rubber feet under base
    builder.add_cylinder(-3.0, -0.15, -3.5, 0.5, 0.3, axis='y')
    builder.add_cylinder(3.0, -0.15, -3.5, 0.5, 0.3, axis='y')
    builder.add_cylinder(-3.0, -0.15, 3.5, 0.5, 0.3, axis='y')
    builder.add_cylinder(3.0, -0.15, 3.5, 0.5, 0.3, axis='y')
    
    # 2. Central Joint & Reinforcement Arm (articulated hinge mount)
    # Sturdy hinge cylinder at base (Y: 0.6 to 2.2, Z: -1.0 to 1.0)
    builder.add_cylinder(0.0, 1.4, 0.0, 1.2, 3.6, axis='x', segments=20)
    # Hinge screw bolt caps
    builder.add_cylinder(1.9, 1.4, 0.0, 0.9, 0.4, axis='x', segments=16)
    builder.add_cylinder(-1.9, 1.4, 0.0, 0.9, 0.4, axis='x', segments=16)
    
    # Articulated Arm (Y: 1.4 to 6.2, tilting back)
    # Lower arm beam
    builder.add_box(-1.6, 1.4, -0.8, 1.6, 5.8, 0.8)
    
    # Upper Hinge Joint
    builder.add_cylinder(0.0, 5.8, 0.0, 1.1, 3.4, axis='x', segments=20)
    
    # 3. Cradle / Backrest Plate (Width 7.0cm, Height 8.5cm, tilted back ~20 deg)
    # Main cradle backplate
    builder.add_box(-3.5, 3.5, 0.6, 3.5, 9.8, 1.1)
    
    # Cable pass-through slot cutout ribs
    builder.add_box(-3.5, 3.5, 1.1, -1.2, 5.2, 1.5)
    builder.add_box(1.2, 3.5, 1.1, 3.5, 5.2, 1.5)
    
    # 4. Bottom Holding Hooks / Prongs (to cradle the phone safely)
    # Left hook
    builder.add_box(-3.5, 3.2, 1.1, -1.2, 3.7, 3.0)
    builder.add_box(-3.5, 3.7, 2.5, -1.2, 5.0, 3.0)
    # Right hook
    builder.add_box(1.2, 3.2, 1.1, 3.5, 3.7, 3.0)
    builder.add_box(1.2, 3.7, 2.5, 3.5, 5.0, 3.0)
    
    # 5. Side Clamping Wings / Grippers (Auto/Moto vibration grips)
    builder.add_box(-4.2, 6.0, 0.7, -3.5, 8.2, 2.4)
    builder.add_box(3.5, 6.0, 0.7, 4.2, 8.2, 2.4)
    
    # Ball joint connector behind cradle
    builder.add_cylinder(0.0, 6.5, 0.2, 0.9, 1.2, axis='z', segments=16)
    
    glb = builder.build_glb(
        name='SoporteUniversalArticulado',
        base_color=[0.14, 0.16, 0.20, 1.0], # Industrial matte black PETG
        roughness=0.55,
        metallic=0.2
    )
    return glb


def generate_keychain():
    builder = MeshBuilder()
    
    # Coordinates in cm (Width: 6.2cm, Height: 2.5cm, Thickness: 0.4cm)
    # Base rectangle
    builder.add_box(-2.8, -1.1, -0.2, 2.8, 1.1, 0.2)
    
    # Left rounded tab for keyring hole
    builder.add_cylinder(-2.8, 0.0, 0.0, 1.1, 0.4, axis='z', segments=24)
    # Keyring hole
    # Inner hole through the tab
    builder.add_ring(-2.8, 0.0, 0.0, 1.1, 0.45, 0.4, axis='z', segments=20)
    
    # Raised border / rim around perimeter (+0.12cm height on +Z face)
    builder.add_box(-2.8, 0.95, 0.2, 2.8, 1.15, 0.32)
    builder.add_box(-2.8, -1.15, 0.2, 2.8, -0.95, 0.32)
    builder.add_box(2.6, -1.15, 0.2, 2.8, 1.15, 0.32)
    
    # 3D Raised "PEDIGOCHOS" Lettering Blocks in relief (+Z face from 0.2 to 0.34)
    # We create stylized clean geometric letters: P E D I G O C H O S
    letters_data = [
        # P
        [(-2.2, -0.65, -2.0, 0.65), (-2.0, 0.45, -1.7, 0.65), (-1.7, 0.1, -1.5, 0.65), (-2.0, 0.1, -1.7, 0.3)],
        # E
        [(-1.3, -0.65, -1.1, 0.65), (-1.1, 0.45, -0.7, 0.65), (-1.1, -0.1, -0.8, 0.1), (-1.1, -0.65, -0.7, -0.45)],
        # D
        [(-0.5, -0.65, -0.3, 0.65), (-0.3, 0.45, 0.0, 0.65), (0.0, -0.45, 0.2, 0.45), (-0.3, -0.65, 0.0, -0.45)],
        # I
        [(0.4, -0.65, 0.6, 0.65)],
        # G
        [(0.8, -0.65, 1.0, 0.65), (1.0, 0.45, 1.4, 0.65), (1.0, -0.65, 1.4, -0.45), (1.2, -0.65, 1.4, 0.0), (1.0, -0.1, 1.4, 0.1)],
        # O
        [(1.6, -0.65, 1.8, 0.65), (1.8, 0.45, 2.2, 0.65), (2.2, -0.65, 2.4, 0.65), (1.8, -0.65, 2.2, -0.45)],
        # S
        [(2.5, 0.45, 3.0, 0.65), (2.5, 0.0, 2.7, 0.65), (2.5, -0.05, 3.0, 0.15), (2.8, -0.65, 3.0, 0.0), (2.5, -0.65, 3.0, -0.45)]
    ]
    
    # Scale and center letters
    for letter in letters_data:
        for (x0, y0, x1, y1) in letter:
            # map range to fit neatly on keychain
            sx0 = (x0 - 0.4) * 0.78
            sx1 = (x1 - 0.4) * 0.78
            sy0 = y0 * 0.85
            sy1 = y1 * 0.85
            builder.add_box(sx0, sy0, 0.2, sx1, sy1, 0.35)

    # Keyring chain and ring (3D metal loops)
    builder.add_cylinder(-3.5, 0.0, 0.0, 0.35, 0.15, axis='y', segments=16)
    builder.add_cylinder(-4.2, 0.0, 0.0, 0.35, 0.15, axis='x', segments=16)
    # Big keyring loop
    builder.add_cylinder(-5.4, 0.0, 0.0, 1.3, 0.18, axis='z', segments=32)

    glb = builder.build_glb(
        name='LlaveroPersonalizadoPediGochos',
        base_color=[0.92, 0.58, 0.08, 1.0], # Vibrant dual color / Silk gold orange
        roughness=0.45,
        metallic=0.25
    )
    return glb


def main():
    target_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'models')
    ensure_dir(target_dir)

    stand_path = os.path.join(target_dir, 'soporte_celular.glb')
    stand_data = generate_phone_stand()
    with open(stand_path, 'wb') as f:
        f.write(stand_data)
    print(f'Created {stand_path} ({len(stand_data)} bytes)')

    keychain_path = os.path.join(target_dir, 'llavero_pedigochos.glb')
    keychain_data = generate_keychain()
    with open(keychain_path, 'wb') as f:
        f.write(keychain_data)
    print(f'Created {keychain_path} ({len(keychain_data)} bytes)')

if __name__ == '__main__':
    main()
