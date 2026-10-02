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

    def add_frustum(self, cx, cy, cz, r_bot, r_top, h, segments=24):
        # Conical frustum aligned along Y axis
        half_h = h / 2.0
        dr = r_bot - r_top
        slant = math.sqrt(h * h + dr * dr)
        norm_r = h / slant
        norm_y = dr / slant
        
        ring_bot = []
        ring_top = []
        
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            c = math.cos(angle)
            s = math.sin(angle)
            
            px_b = cx + r_bot * c
            pz_b = cz + r_bot * s
            py_b = cy - half_h
            
            px_t = cx + r_top * c
            pz_t = cz + r_top * s
            py_t = cy + half_h
            
            norm = [c * norm_r, norm_y, s * norm_r]
            ring_bot.append(self.add_vertex([px_b, py_b, pz_b], norm))
            ring_top.append(self.add_vertex([px_t, py_t, pz_t], norm))
            
        for i in range(segments):
            next_i = (i + 1) % segments
            self.add_quad(ring_bot[i], ring_bot[next_i], ring_top[next_i], ring_top[i])

    def add_ring(self, cx, cy, cz, r_out, r_in, h, axis='z', segments=24):
        half_h = h / 2.0
        self.add_cylinder(cx, cy, cz, r_out, h, axis=axis, segments=segments)
        
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
                norm = [-c, -s, 0]
                ring_in1.append(self.add_vertex([px, py, pz1], norm))
                ring_in2.append(self.add_vertex([px, py, pz2], norm))
            elif axis == 'y':
                px = cx + r_in * c
                pz = cz + r_in * s
                py1 = cy - half_h
                py2 = cy + half_h
                norm = [-c, 0, -s]
                ring_in1.append(self.add_vertex([px, py1, pz], norm))
                ring_in2.append(self.add_vertex([px, py2, pz], norm))
            elif axis == 'x':
                py = cy + r_in * c
                pz = cz + r_in * s
                px1 = cx - half_h
                px2 = cx + half_h
                norm = [0, -c, -s]
                ring_in1.append(self.add_vertex([px1, py, pz], norm))
                ring_in2.append(self.add_vertex([px2, py, pz], norm))
        for i in range(segments):
            next_i = (i + 1) % segments
            self.add_quad(ring_in1[i], ring_in2[i], ring_in2[next_i], ring_in1[next_i])

    def build_glb(self, name='Model', base_color=[0.25, 0.28, 0.35, 1.0], roughness=0.55, metallic=0.15):
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


# =========================================================================
# 1. SOPORTE CELULAR AUTO & MOTO (PETG)
# =========================================================================
def generate_phone_stand():
    builder = MeshBuilder()
    
    # Base Plate
    builder.add_box(-3.75, 0.0, -4.25, 3.75, 0.6, 4.25)
    
    # Rubber feet under base
    builder.add_cylinder(-3.0, -0.15, -3.5, 0.5, 0.3, axis='y')
    builder.add_cylinder(3.0, -0.15, -3.5, 0.5, 0.3, axis='y')
    builder.add_cylinder(-3.0, -0.15, 3.5, 0.5, 0.3, axis='y')
    builder.add_cylinder(3.0, -0.15, 3.5, 0.5, 0.3, axis='y')
    
    # Central Hinge mount
    builder.add_cylinder(0.0, 1.4, 0.0, 1.2, 3.6, axis='x', segments=20)
    builder.add_cylinder(1.9, 1.4, 0.0, 0.9, 0.4, axis='x', segments=16)
    builder.add_cylinder(-1.9, 1.4, 0.0, 0.9, 0.4, axis='x', segments=16)
    
    # Articulated Arm
    builder.add_box(-1.6, 1.4, -0.8, 1.6, 5.8, 0.8)
    builder.add_cylinder(0.0, 5.8, 0.0, 1.1, 3.4, axis='x', segments=20)
    
    # Cradle / Backrest Plate
    builder.add_box(-3.5, 3.5, 0.6, 3.5, 9.8, 1.1)
    builder.add_box(-3.5, 3.5, 1.1, -1.2, 5.2, 1.5)
    builder.add_box(1.2, 3.5, 1.1, 3.5, 5.2, 1.5)
    
    # Bottom Holding Hooks
    builder.add_box(-3.5, 3.2, 1.1, -1.2, 3.7, 3.0)
    builder.add_box(-3.5, 3.7, 2.5, -1.2, 5.0, 3.0)
    builder.add_box(1.2, 3.2, 1.1, 3.5, 3.7, 3.0)
    builder.add_box(1.2, 3.7, 2.5, 3.5, 5.0, 3.0)
    
    # Side Grippers
    builder.add_box(-4.2, 6.0, 0.7, -3.5, 8.2, 2.4)
    builder.add_box(3.5, 6.0, 0.7, 4.2, 8.2, 2.4)
    builder.add_cylinder(0.0, 6.5, 0.2, 0.9, 1.2, axis='z', segments=16)
    
    return builder.build_glb(
        name='SoporteUniversalArticulado',
        base_color=[0.14, 0.16, 0.20, 1.0],
        roughness=0.55,
        metallic=0.2
    )


# =========================================================================
# 2. LLAVERO PERSONALIZADO PEDIGOCHOS / EMPRENDEDORES 3D
# =========================================================================
def generate_keychain():
    builder = MeshBuilder()
    
    # Base rectangle
    builder.add_box(-2.8, -1.1, -0.2, 2.8, 1.1, 0.2)
    builder.add_cylinder(-2.8, 0.0, 0.0, 1.1, 0.4, axis='z', segments=24)
    builder.add_ring(-2.8, 0.0, 0.0, 1.1, 0.45, 0.4, axis='z', segments=20)
    
    # Raised border
    builder.add_box(-2.8, 0.95, 0.2, 2.8, 1.15, 0.32)
    builder.add_box(-2.8, -1.15, 0.2, 2.8, -0.95, 0.32)
    builder.add_box(2.6, -1.15, 0.2, 2.8, 1.15, 0.32)
    
    # Lettering in relief
    letters_data = [
        [(-2.2, -0.65, -2.0, 0.65), (-2.0, 0.45, -1.7, 0.65), (-1.7, 0.1, -1.5, 0.65), (-2.0, 0.1, -1.7, 0.3)],
        [(-1.3, -0.65, -1.1, 0.65), (-1.1, 0.45, -0.7, 0.65), (-1.1, -0.1, -0.8, 0.1), (-1.1, -0.65, -0.7, -0.45)],
        [(-0.5, -0.65, -0.3, 0.65), (-0.3, 0.45, 0.0, 0.65), (0.0, -0.45, 0.2, 0.45), (-0.3, -0.65, 0.0, -0.45)],
        [(0.4, -0.65, 0.6, 0.65)],
        [(0.8, -0.65, 1.0, 0.65), (1.0, 0.45, 1.4, 0.65), (1.0, -0.65, 1.4, -0.45), (1.2, -0.65, 1.4, 0.0), (1.0, -0.1, 1.4, 0.1)],
        [(1.6, -0.65, 1.8, 0.65), (1.8, 0.45, 2.2, 0.65), (2.2, -0.65, 2.4, 0.65), (1.8, -0.65, 2.2, -0.45)],
        [(2.5, 0.45, 3.0, 0.65), (2.5, 0.0, 2.7, 0.65), (2.5, -0.05, 3.0, 0.15), (2.8, -0.65, 3.0, 0.0), (2.5, -0.65, 3.0, -0.45)]
    ]
    
    for letter in letters_data:
        for (x0, y0, x1, y1) in letter:
            sx0 = (x0 - 0.4) * 0.78
            sx1 = (x1 - 0.4) * 0.78
            sy0 = y0 * 0.85
            sy1 = y1 * 0.85
            builder.add_box(sx0, sy0, 0.2, sx1, sy1, 0.35)

    # Keyring links and chain
    builder.add_cylinder(-3.5, 0.0, 0.0, 0.35, 0.15, axis='y', segments=16)
    builder.add_cylinder(-4.2, 0.0, 0.0, 0.35, 0.15, axis='x', segments=16)
    builder.add_cylinder(-5.4, 0.0, 0.0, 1.3, 0.18, axis='z', segments=32)

    return builder.build_glb(
        name='LlaveroPersonalizadoPediGochos',
        base_color=[0.92, 0.58, 0.08, 1.0],
        roughness=0.45,
        metallic=0.25
    )


# =========================================================================
# 3. SOPORTE ERGONÓMICO DE MESA CON RANURA PASACABLES (ERGONOM 60)
# Matches soporte_escritorio_3d.jpg
# =========================================================================
def generate_desk_stand():
    builder = MeshBuilder()
    
    # 1. Base Plate: sturdy footprint (X: -4.0 to 4.0, Y: 0.0 to 1.0, Z: -5.0 to 5.0)
    builder.add_box(-4.0, 0.0, -5.0, 4.0, 1.0, 5.0)
    
    # Rounded corners on base
    builder.add_cylinder(-3.6, 0.5, -4.6, 0.4, 1.0, axis='y', segments=16)
    builder.add_cylinder(3.6, 0.5, -4.6, 0.4, 1.0, axis='y', segments=16)
    builder.add_cylinder(-3.6, 0.5, 4.6, 0.4, 1.0, axis='y', segments=16)
    builder.add_cylinder(3.6, 0.5, 4.6, 0.4, 1.0, axis='y', segments=16)

    # Circular/oval cable pass-through hole in base
    builder.add_ring(0.0, 0.5, -1.0, 1.4, 0.8, 1.02, axis='y', segments=20)
    # Cable groove indentation running backwards on base top
    builder.add_box(-0.6, 0.7, -1.0, 0.6, 1.02, 5.0)

    # 2. Hollow Triangular 60° Angled Backrest Tower
    # Left A-frame upright arm (X: -3.8 to -2.0)
    builder.add_box(-3.8, 1.0, -2.0, -2.2, 10.5, 2.5)
    # Right A-frame upright arm (X: 2.2 to 3.8)
    builder.add_box(2.2, 1.0, -2.0, 3.8, 10.5, 2.5)
    
    # Slanted rear diagonal brace strut (forming the hollow triangular profile at 60°)
    builder.add_box(-3.8, 1.0, 1.5, -2.2, 8.5, 4.5)
    builder.add_box(2.2, 1.0, 1.5, 3.8, 8.5, 4.5)
    
    # Top connecting bridge / headrest
    builder.add_box(-3.8, 9.5, 0.5, 3.8, 11.2, 2.5)
    # Top curved crown
    builder.add_cylinder(0.0, 11.2, 1.5, 1.2, 7.6, axis='x', segments=20)

    # 3. Front Cradling Ledge & Hooks (for phone/tablet with silicone lip)
    # Left hook
    builder.add_box(-3.8, 2.5, -3.8, -1.2, 3.6, -1.5) # bottom ledge
    builder.add_box(-3.8, 3.6, -4.2, -1.2, 5.2, -3.4) # upturned retaining front lip
    builder.add_cylinder(-2.5, 5.2, -3.8, 0.4, 2.6, axis='x', segments=16) # rounded hook rim
    
    # Right hook
    builder.add_box(1.2, 2.5, -3.8, 3.8, 3.6, -1.5) # bottom ledge
    builder.add_box(1.2, 3.6, -4.2, 3.8, 5.2, -3.4) # upturned retaining front lip
    builder.add_cylinder(2.5, 5.2, -3.8, 0.4, 2.6, axis='x', segments=16)

    # 4. Embossed "ERGONOM 60" logo on the lower right flank of base
    # Embossed detail block on right side
    builder.add_box(4.0, 0.2, -2.5, 4.15, 0.8, 2.5)
    builder.add_box(4.0, 0.35, -2.2, 4.25, 0.65, -0.5)

    return builder.build_glb(
        name='SoporteEscritorioErgonom60',
        base_color=[0.18, 0.20, 0.23, 1.0], # Matte Dark Slate PLA+
        roughness=0.60,
        metallic=0.15
    )


# =========================================================================
# 4. EMBUDO AUTOMOTRIZ ANTIDERRAMES CON ROSCA UNIVERSAL
# Matches embudo_automotriz_3d.jpg
# =========================================================================
def generate_automotive_funnel():
    builder = MeshBuilder()

    # 1. Main Conical Hopper / Basin (Bright Safety Orange PETG)
    # Large upper funnel body: r_top = 4.8cm, r_bot = 2.4cm, height 7.5cm (Y: 4.0 to 11.5)
    builder.add_frustum(0.0, 7.75, 0.0, r_bot=2.4, r_top=4.8, h=7.5, segments=32)
    # Inner wall of hopper for hollow interior
    builder.add_frustum(0.0, 7.75, 0.0, r_bot=2.0, r_top=4.4, h=7.5, segments=32)
    
    # Top rim rolled bead / anti-splash lip
    builder.add_cylinder(0.0, 11.7, 0.0, 4.95, 0.5, axis='y', segments=32)
    builder.add_cylinder(0.0, 12.0, 0.0, 5.1, 0.4, axis='y', segments=32)

    # 2. Sturdy Ergonomic Pitcher Loop Handle with Finger Grooves (on +X side)
    # Top handle anchor to upper rim
    builder.add_box(4.2, 9.8, -0.6, 6.8, 10.8, 0.6)
    # Outer vertical handle bar with grip finger scallops
    builder.add_box(6.0, 4.0, -0.7, 7.2, 10.4, 0.7)
    # Finger scallops / grips on inside face
    builder.add_cylinder(6.0, 5.2, 0.0, 0.45, 1.2, axis='z', segments=16)
    builder.add_cylinder(6.0, 6.8, 0.0, 0.45, 1.2, axis='z', segments=16)
    builder.add_cylinder(6.0, 8.4, 0.0, 0.45, 1.2, axis='z', segments=16)
    # Bottom handle anchor to lower neck
    builder.add_box(2.2, 3.8, -0.6, 6.5, 4.8, 0.6)

    # 3. Heavy-Duty Threaded Collar Ring (Black screw threads at bottom, Y: 0.5 to 4.0)
    builder.add_cylinder(0.0, 2.25, 0.0, 2.65, 3.5, axis='y', segments=32)
    # Horizontal screw thread ridges
    builder.add_cylinder(0.0, 1.2, 0.0, 2.85, 0.4, axis='y', segments=32)
    builder.add_cylinder(0.0, 2.0, 0.0, 2.85, 0.4, axis='y', segments=32)
    builder.add_cylinder(0.0, 2.8, 0.0, 2.85, 0.4, axis='y', segments=32)
    builder.add_cylinder(0.0, 3.6, 0.0, 2.85, 0.4, axis='y', segments=32)

    # 4. Angled Tubular Dispensing Spout (tapering downwards at an angle)
    # Upper spout joint
    builder.add_cylinder(0.0, 0.0, 0.0, 2.1, 1.2, axis='y', segments=28)
    # Angled nozzle segment (tilted 15 deg forward)
    builder.add_frustum(0.0, -2.2, 0.4, r_bot=1.3, r_top=1.9, h=3.6, segments=24)
    # Angled nozzle tip
    builder.add_cylinder(0.0, -4.2, 0.8, 1.25, 1.2, axis='y', segments=24)

    return builder.build_glb(
        name='EmbudoAutomotrizAntiderrames',
        base_color=[0.96, 0.46, 0.06, 1.0], # Safety Orange PETG
        roughness=0.45,
        metallic=0.15
    )


# =========================================================================
# 5. CLIP DISPENSADOR CON TAPA A ROSCA HERMÉTICA PARA BOLSAS
# Matches clip_dispensador_3d.jpg
# =========================================================================
def generate_bag_clip_dispenser():
    builder = MeshBuilder()

    # 1. Central Dispenser Housing (Turquoise/Teal PETG/PLA)
    # Rectangular center block (X: -3.5 to 3.5, Y: -1.6 to 1.6, Z: -0.8 to 0.8)
    builder.add_box(-3.5, -1.6, -0.8, 3.5, 1.6, 0.8)
    
    # Embossed "SNAP" & "[3D]" relief on upper face
    builder.add_box(-1.8, 0.6, 0.8, 0.2, 1.3, 0.95)
    builder.add_box(0.8, 0.6, 0.8, 2.2, 1.3, 0.95)

    # 2. Side Clamping Bar Arms (White structural clamp jaws)
    # Left clamping arm with hinge joint
    builder.add_box(-6.4, -1.4, -0.6, -3.5, 1.4, 0.6)
    builder.add_cylinder(-6.4, 0.0, 0.0, 1.1, 1.2, axis='z', segments=20) # hinge barrel
    
    # Right clamping arm with snap-lock clasp
    builder.add_box(3.5, -1.4, -0.6, 6.4, 1.4, 0.6)
    builder.add_box(6.0, -1.6, -0.8, 6.7, 1.6, 0.8) # lock clip housing
    builder.add_cylinder(6.7, 0.0, 0.0, 0.8, 1.2, axis='y', segments=16) # clasp latch

    # 3. Cylindrical Pouring Spout protruding forward from center (tilted slightly downwards)
    # Base collar on spout
    builder.add_cylinder(0.0, -0.2, 1.4, 2.1, 1.2, axis='z', segments=28)
    # Spout cylinder
    builder.add_cylinder(0.0, -0.3, 2.4, 1.8, 1.4, axis='z', segments=28)
    # Inner pouring lumen hole
    builder.add_ring(0.0, -0.3, 2.4, 1.8, 1.4, 1.42, axis='z', segments=28)
    
    # Screw threads on the spout exterior
    builder.add_cylinder(0.0, -0.3, 2.0, 1.95, 0.25, axis='z', segments=28)
    builder.add_cylinder(0.0, -0.3, 2.6, 1.95, 0.25, axis='z', segments=28)

    # 4. Knurled Screw-On Cap (resting near spout / attached)
    # Threaded Cap Cylinder
    builder.add_cylinder(0.0, -0.3, 3.4, 2.1, 0.9, axis='z', segments=32)
    # Perimeter knurling ribs for easy twist opening
    for i in range(16):
        ang = 2.0 * math.pi * i / 16
        rx = 2.15 * math.cos(ang)
        ry = -0.3 + 2.15 * math.sin(ang)
        builder.add_cylinder(rx, ry, 3.4, 0.22, 0.9, axis='z', segments=8)
    # Cap top dome
    builder.add_cylinder(0.0, -0.3, 3.9, 1.9, 0.25, axis='z', segments=32)

    return builder.build_glb(
        name='ClipDispensadorHermetico',
        base_color=[0.08, 0.68, 0.66, 1.0], # Nordic Teal PLA
        roughness=0.45,
        metallic=0.10
    )


# =========================================================================
# 6. CAJA PROTECTORA OCULTA CON IMÁN DE NEODIMIO (PETG INDUSTRIAL)
# Matches caja_magnetica_3d.jpg
# =========================================================================
def generate_magnetic_case():
    builder = MeshBuilder()

    # 1. Main Rugged Enclosure (Tactical Olive Green / Armor Graphite PETG)
    # Main capsule body (X: -3.8 to 3.8, Y: -1.2 to 1.2, Z: -2.6 to 2.6)
    builder.add_box(-3.8, -1.2, -2.6, 3.8, 1.2, 2.6)
    
    # 4 Reinforced Corner Columns with hex bolt heads
    corners = [(-3.6, -2.4), (3.6, -2.4), (-3.6, 2.4), (3.6, 2.4)]
    for (cx, cz) in corners:
        builder.add_cylinder(cx, 0.0, cz, 0.6, 2.4, axis='y', segments=16)
        # Hex socket bolt head on top
        builder.add_cylinder(cx, 1.35, cz, 0.45, 0.3, axis='y', segments=12)

    # Side impact armor ribs
    builder.add_box(-4.05, -0.8, -1.8, -3.8, 0.8, 1.8)
    builder.add_box(3.8, -0.8, -1.8, 4.05, 0.8, 1.8)

    # 2. Waterproof Lid Cover with O-ring Gasket (Black textured lid)
    # Top lid plate (Y: 1.2 to 2.4)
    builder.add_box(-4.0, 1.2, -2.8, 4.0, 2.2, 2.8)
    # Perimeter rubber gasket seal line (dark seal groove)
    builder.add_box(-4.1, 1.1, -2.9, 4.1, 1.25, 2.9)
    
    # Embossed "RUGGED / WATERPROOF" on lid
    builder.add_box(-2.8, 2.2, -1.6, 2.8, 2.35, -0.6)
    builder.add_box(-3.2, 2.2, 0.2, 3.2, 2.35, 1.2)
    
    # Heavy-duty side latch clasps
    builder.add_box(-4.15, 0.4, -0.8, -3.8, 1.8, 0.8)
    builder.add_box(3.8, 0.4, -0.8, 4.15, 1.8, 0.8)

    # 3. Magnetic Bottom Base Plate with 4 Neodymium Disc Magnets
    # Bottom reinforcement plate
    builder.add_box(-3.9, -1.5, -2.7, 3.9, -1.2, 2.7)
    # Diagonal reinforcement X-truss ribs on bottom
    builder.add_box(-3.6, -1.6, -0.2, 3.6, -1.5, 0.2)
    builder.add_box(-0.2, -1.6, -2.4, 0.2, -1.5, 2.4)

    # 4 Flush-Mounted Neodymium Magnet Discs N52 (High metallic luster)
    magnet_positions = [(-2.5, -1.6), (2.5, -1.6), (-2.5, 1.6), (2.5, 1.6)]
    for (mx, mz) in magnet_positions:
        # Magnet recess rim
        builder.add_cylinder(mx, -1.5, mz, 1.1, 0.2, axis='y', segments=20)
        # Silver neodymium magnet disc
        builder.add_cylinder(mx, -1.55, mz, 0.95, 0.2, axis='y', segments=24)

    return builder.build_glb(
        name='CajaMagneticaNeodimio',
        base_color=[0.24, 0.28, 0.22, 1.0], # Tactical Military Olive PETG
        roughness=0.50,
        metallic=0.20
    )


# =========================================================================
# MAIN ENTRY POINT: GENERATE ALL 6 PRODUCTION 3D MODELS
# =========================================================================
def main():
    target_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'models')
    ensure_dir(target_dir)

    models_to_generate = [
        ('soporte_celular.glb', generate_phone_stand),
        ('llavero_pedigochos.glb', generate_keychain),
        ('soporte_escritorio.glb', generate_desk_stand),
        ('embudo_automotriz.glb', generate_automotive_funnel),
        ('clip_dispensador.glb', generate_bag_clip_dispenser),
        ('caja_magnetica.glb', generate_magnetic_case),
    ]

    for filename, generator_func in models_to_generate:
        file_path = os.path.join(target_dir, filename)
        glb_data = generator_func()
        with open(file_path, 'wb') as f:
            f.write(glb_data)
        print(f'[OK] Successfully generated {filename} ({len(glb_data)} bytes)')

if __name__ == '__main__':
    main()
