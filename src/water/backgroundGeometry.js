import * as THREE from "three/webgpu";
import {Fn, attribute, triNoise3D, time, positionLocal, smoothstep, vec3, pow, min, mat3} from "three/tsl";

class BackgroundGeometry {
    object = null;
    constructor() {
        const positionArray = [];
        const normalArray = [];
        const indices = [];
        let vertexId = 0;

        const addVertex = (position, normal) => {
            positionArray.push(...position);
            normalArray.push(...normal);
            vertexId++;
            return vertexId-1;
        }

        const frontRows = [];
        for (let y = 0; y<4; y++) {
            const row = [];
            for (let x = 0; x<4; x++) {
                const px = -96 + x * 64;
                const py = -96 + y * 64;
                row.push(addVertex([px,py,0],[0,0,-1]));
            }
            frontRows.push(row);
        }

        for (let y = 0; y<3; y++) {
            for (let x = 0; x < 3; x++) {
                if (x === 1 && y === 1) { continue; }
                const v0 = frontRows[y][x];
                const v1 = frontRows[y][x+1];
                const v2 = frontRows[y+1][x];
                const v3 = frontRows[y+1][x+1]
                indices.push(v2,v1,v0);
                indices.push(v1,v2,v3);
            }
        }

        const positionAttribute = new THREE.BufferAttribute(new Float32Array(positionArray), 3, false);
        const normalAttribute = new THREE.BufferAttribute(new Float32Array(normalArray), 3, false);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", positionAttribute);
        geometry.setAttribute("normal", normalAttribute);
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardNodeMaterial();

        material.colorNode = Fn(() => {
           const p = positionLocal.mul(0.004).add(vec3(0,0,positionLocal.x.mul(0.004).mul(0.2)));

            const matrix = mat3(-2/3,-1/3,2/3, 3/3,-2/3,1/3, 1/3,2/3,2/3);
            const water = vec3(p.mul(2)).toVar();
            //water.x.sub(positionWorld.y);
            //water.addAssign(sin(time.mul(0.2)));
            water.assign(matrix.mul(water));
            const a = vec3(0.5).sub(water.fract()).length().toVar();
            water.assign(matrix.mul(water));
            a.assign(min(a,vec3(0.5).sub(water.fract()).length()));

            return pow(a,4);
           const noise = triNoise3D(p,time,0.2)
           return noise.add(smoothstep(0.35, 0.4, noise).mul(0.3)).mul(1.0).oneMinus(); //noise.mul(smoothstep(noise,0.3,0.8).oneMinus());

        })();

        this.object = new THREE.Mesh(geometry, material);


    }
}
export default BackgroundGeometry;