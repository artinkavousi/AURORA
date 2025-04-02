import * as THREE from "three/webgpu";
import {
    array,
    attributeArray,
    Fn,
    If,
    instancedArray,
    instanceIndex,
    Return,
    uniform,
    int,
    floor,
    float,
    Loop,
    vec3,
    atomicAdd,
    atomicStore,
    uint,
    storage,
    max,
    pow,
    mat3,
    clamp,
    triNoise3D,
    time,
    struct,
    NodeAccess
} from "three/tsl";

const stiffness = 3.;
const restDensity = 4.;
const dynamicViscosity = 0.1;

class mlsMpmSimulator {
    renderer = null;
    numParticles = 0;
    gridSize = new THREE.Vector3(0,0,0);
    gridCellSize = new THREE.Vector3(0,0,0);
    uniforms = {};
    kernels = {};
    fixedPointMultiplier = 1e7;


    constructor(renderer, numParticles) {
        this.renderer = renderer;
        this.numParticles = numParticles;
        this.gridSize.set(64,64,64);
        this.gridCellSize.set(1,1,1).divideScalar(16);


        this.positionArray = new Float32Array(this.numParticles * 3);
        const vec = new THREE.Vector3();
        for (let i = 0; i < this.numParticles; i++) {
            let dist = 2;
            while (dist > 1) {
                vec.set(Math.random(),Math.random(),Math.random()).multiplyScalar(2.0).subScalar(1.0);
                dist = vec.length();
                vec.addScalar(1.0).divideScalar(2.0).multiply(this.gridSize);
                this.positionArray[i*3+0] = vec.x;
                this.positionArray[i*3+1] = vec.y;
                this.positionArray[i*3+2] = vec.z;
            }


        }
        this.positionBuffer = instancedArray(this.positionArray, "vec3").label("particlePositionBuffer");
        this.velocityBuffer = instancedArray(this.numParticles, "vec3").label("particleVelocityBuffer");
        this.CBuffer = instancedArray(this.numParticles, "mat3").label("particleCBuffer");

        const cellCount = this.gridSize.x * this.gridSize.y * this.gridSize.z;


        const cellStruct = struct( {
            x: { type: 'int', atomic: true },
            y: { type: 'int', atomic: true },
            z: { type: 'int', atomic: true },
            mass: { type: 'int', atomic: true },
        } );
        this.cellBuffer = instancedArray(cellCount, cellStruct).label('cellData');
        console.log(cellStruct, this.cellBuffer);

        this.cellBufferV = instancedArray(cellCount, 'vec3').label('cellDataV');
        /*this.cellBufferVx = instancedArray(cellCount, 'int').setPBO(true).toAtomic().label('cellDataVX');
        this.cellBufferVy = instancedArray(cellCount, 'int').setPBO(true).toAtomic().label('cellDataVY');
        this.cellBufferVz = instancedArray(cellCount, 'int').setPBO(true).toAtomic().label('cellDataVZ');
        this.cellBufferMass = instancedArray(cellCount, 'int').setPBO(true).toAtomic().label('cellDataMass');*/

        this.uniforms.gridSize = uniform(this.gridSize, "ivec3");
        this.uniforms.gridCellSize = uniform(this.gridCellSize);
        this.uniforms.dt = uniform(0.1);

        this.kernels.clearGrid = Fn(() => {
            this.cellBuffer.structTypeNode.membersLayout[0].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[1].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[2].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[3].atomic = false;

            If(instanceIndex.greaterThanEqual(uint(cellCount)), () => {
                Return();
            });

            this.cellBuffer.element(instanceIndex).get('x').assign(0);
            this.cellBuffer.element(instanceIndex).get('y').assign(0);
            this.cellBuffer.element(instanceIndex).get('z').assign(0);
            this.cellBuffer.element(instanceIndex).get('mass').assign(0);
            this.cellBufferV.element(instanceIndex).assign(0);
            /*atomicStore(this.cellBufferMass.element(instanceIndex), int(0));
            atomicStore(this.cellBufferVx.element(instanceIndex), 0);
            atomicStore(this.cellBufferVy.element(instanceIndex), 0);
            atomicStore(this.cellBufferVz.element(instanceIndex), 0);*/
        })().debug().compute(cellCount);

        const encodeFixedPoint = (f32) => {
            return int(f32.mul(this.fixedPointMultiplier));
        }
        const decodeFixedPoint = (i32) => {
            return float(i32).div(this.fixedPointMultiplier);
        }

        this.kernels.p2g1 = Fn(() => {
            this.cellBuffer.structTypeNode.membersLayout[0].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[1].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[2].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[3].atomic = true;

            If(instanceIndex.greaterThanEqual(uint(this.numParticles)), () => {
                Return();
            });
            const gridSize = this.uniforms.gridSize;
            const particlePosition = this.positionBuffer.element(instanceIndex).xyz;
            const particleVelocity = this.velocityBuffer.element(instanceIndex).xyz;
            const weights = array("vec3", 3).toVar("weights");
            const cellIndex =  floor(particlePosition).toVar("cellIndex");
            const cellDiff = particlePosition.sub(cellIndex.add(0.5)).toVar("cellDiff");
            weights.element(0).assign(float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff)));
            weights.element(1).assign(float(0.75).sub(cellDiff.mul(cellDiff)));
            weights.element(2).assign(float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff)));

            const C = this.CBuffer.element(instanceIndex).toVar();
            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(vec3(gx,gy,gz)).sub(1).toVar();
                        const cellDist = cellX.add(0.5).sub(particlePosition);
                        const Q = C.mul(cellDist);

                        const massContrib = weight; // assuming particle mass = 1.0
                        const velContrib = massContrib.mul(particleVelocity.add(Q)).toVar("velContrib");
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toVar("cellIndex");
                        atomicAdd(this.cellBuffer.element(cellPtr).get('x'), encodeFixedPoint(velContrib.x));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('y'), encodeFixedPoint(velContrib.y));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('z'), encodeFixedPoint(velContrib.z));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('mass'), encodeFixedPoint(massContrib));
                    });
                });
            });
        })().debug().compute(this.numParticles);


        this.kernels.p2g2 = Fn(() => {
            this.cellBuffer.structTypeNode.membersLayout[0].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[1].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[2].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[3].atomic = false;

            If(instanceIndex.greaterThanEqual(uint(this.numParticles)), () => {
                Return();
            });
            const gridSize = this.uniforms.gridSize;
            const particlePosition = this.positionBuffer.element(instanceIndex).xyz;
            //const particleVelocity = this.velocityBuffer.element(instanceIndex).xyz;
            const weights = array("vec3", 3).toVar("weights");
            const cellIndex =  floor(particlePosition).toVar("cellIndex");
            const cellDiff = particlePosition.sub(cellIndex.add(0.5)).toVar("cellDiff");
            weights.element(0).assign(float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff)));
            weights.element(1).assign(float(0.75).sub(cellDiff.mul(cellDiff)));
            weights.element(2).assign(float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff)));

            const density = float(0).toVar("density");
            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(vec3(gx,gy,gz)).sub(1).toVar();
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toVar("cellIndex");
                        density.addAssign(decodeFixedPoint(this.cellBuffer.element(cellPtr).get('mass')).mul(weight));
                    });
                });
            });

            const volume = float(1).div(density);
            const pressure = max(0.0, pow(density.div(restDensity), 5.0).sub(1).mul(stiffness));
            const stress = mat3(pressure.negate(), 0, 0, 0, pressure.negate(), 0, 0, 0, pressure.negate()).toVar();
            const dudv = this.CBuffer.element(instanceIndex);

            const strain = dudv.add(dudv.transpose());
            stress.addAssign(strain.mul(dynamicViscosity));
            const eq16Term0 = volume.mul(-4).mul(stress).mul(this.uniforms.dt);

            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(vec3(gx,gy,gz)).sub(1).toVar();
                        const cellDist = cellX.add(0.5).sub(particlePosition);
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toVar("cellIndex");

                        const momentum = eq16Term0.mul(weight).mul(cellDist).toVar("momentum");
                        atomicAdd(this.cellBuffer.element(cellPtr).get('x'), encodeFixedPoint(momentum.x));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('y'), encodeFixedPoint(momentum.y));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('z'), encodeFixedPoint(momentum.z));
                    });
                });
            });
        })().debug().compute(this.numParticles);



        this.kernels.updateGrid = Fn(() => {
            this.cellBuffer.structTypeNode.membersLayout[0].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[1].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[2].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[3].atomic = false;

            If(instanceIndex.greaterThanEqual(uint(cellCount)), () => {
                Return();
            });
            const mass = decodeFixedPoint(this.cellBuffer.element(instanceIndex).get('mass')).toVar();
            If(mass.lessThanEqual(0), () => { Return(); });

            const vx = decodeFixedPoint(this.cellBuffer.element(instanceIndex).get('x')).div(mass).toVar();
            const vy = decodeFixedPoint(this.cellBuffer.element(instanceIndex).get('y')).div(mass).toVar();
            const vz = decodeFixedPoint(this.cellBuffer.element(instanceIndex).get('z')).div(mass).toVar();
            //vy.subAssign(this.uniforms.dt.mul(0.3));


            const x = int(instanceIndex).div(this.uniforms.gridSize.z).div(this.uniforms.gridSize.y);
            const y = int(instanceIndex).div(this.uniforms.gridSize.z).mod(this.uniforms.gridSize.y);
            const z = int(instanceIndex).mod(this.uniforms.gridSize.z);

            /*const px = float(x).div(float(this.uniforms.gridSize.x)).sub(0.5).toVar();
            const py = float(y).div(float(this.uniforms.gridSize.y)).sub(0.5).toVar();
            const pz = float(z).div(float(this.uniforms.gridSize.z)).sub(0.5).toVar();*/
            /*const p = vec3(x,y,z).div(vec3(this.uniforms.gridSize.sub(1))).sub(0.5).toVar();
            p.assign(p.normalize());
            vx.subAssign(p.x.mul(0.3).mul(this.uniforms.dt));
            vy.subAssign(p.y.mul(0.3).mul(this.uniforms.dt));
            vz.subAssign(p.z.mul(0.3).mul(this.uniforms.dt));*/

            If(x.lessThan(int(2)).or(x.greaterThan(this.uniforms.gridSize.x.sub(int(2)))), () => {
                vx.assign(0);
            });
            If(y.lessThan(int(2)).or(y.greaterThan(this.uniforms.gridSize.y.sub(int(2)))), () => {
                vy.assign(0);
            });
            If(z.lessThan(int(2)).or(z.greaterThan(this.uniforms.gridSize.z.sub(int(2)))), () => {
                vz.assign(0);
            });

            /*this.cellBufferVx.element(instanceIndex).assign(encodeFixedPoint(vx));
            this.cellBufferVy.element(instanceIndex).assign(encodeFixedPoint(vy));
            this.cellBufferVz.element(instanceIndex).assign(encodeFixedPoint(vz));*/
            this.cellBufferV.element(instanceIndex).assign(vec3(vx,vy,vz));
        })().debug().compute(cellCount);



        this.kernels.g2p = Fn(() => {
            If(instanceIndex.greaterThanEqual(uint(this.numParticles)), () => {
                Return();
            });
            const gridSize = this.uniforms.gridSize;
            const particlePosition = this.positionBuffer.element(instanceIndex).xyz.toVar("particlePosition");
            const particleVelocity = vec3(0).toVar();
            const pn = particlePosition.div(vec3(this.uniforms.gridSize.sub(1))).sub(0.5).normalize().toVar();
            particleVelocity.subAssign(pn.mul(0.3).mul(this.uniforms.dt));
            const noise = vec3(
                triNoise3D(particlePosition.mul(0.02), time, 0.21),
                triNoise3D(particlePosition.yzx.mul(0.02), time, 0.22),
                triNoise3D(particlePosition.zxy.mul(0.02), time, 0.23)
            );
            particleVelocity.subAssign(noise.sub(0.289).mul(1.93).mul(this.uniforms.dt));

            const weights = array("vec3", 3).toVar("weights");
            const cellIndex =  floor(particlePosition).toVar("cellIndex");
            const cellDiff = particlePosition.sub(cellIndex.add(0.5)).toVar("cellDiff");
            weights.element(0).assign(float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff)));
            weights.element(1).assign(float(0.75).sub(cellDiff.mul(cellDiff)));
            weights.element(2).assign(float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff)));

            const B = mat3(0).toVar("B");
            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(vec3(gx,gy,gz)).sub(1).toVar();
                        const cellDist = cellX.add(0.5).sub(particlePosition).toVar("cellDist");
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toVar("cellIndex");

                        const weightedVelocity = this.cellBufferV.element(cellPtr).mul(weight).toVar("weightedVelocity");
                        const term = mat3(
                            weightedVelocity.mul(cellDist.x),
                            weightedVelocity.mul(cellDist.y),
                            weightedVelocity.mul(cellDist.z)
                        );
                        B.addAssign(term);
                        particleVelocity.addAssign(weightedVelocity);
                    });
                });
            });

            this.CBuffer.element(instanceIndex).assign(B.mul(4));
            particlePosition.addAssign(particleVelocity.mul(this.uniforms.dt));
            particlePosition.assign(clamp(particlePosition, vec3(2), this.uniforms.gridSize.sub(1)));

            const wallStiffness = 0.3;
            const xN = particlePosition.add(particleVelocity.mul(this.uniforms.dt).mul(3.0)).toVar("xN");
            const wallMin = vec3(3).toVar("wallMin");
            const wallMax = this.uniforms.gridSize.sub(4).toVar("wallMax");
            If(xN.x.lessThan(wallMin.x), () => { particleVelocity.x.addAssign(wallMin.x.sub(xN.x).mul(wallStiffness)); });
            If(xN.x.greaterThan(wallMax.x), () => { particleVelocity.x.addAssign(wallMax.x.sub(xN.x).mul(wallStiffness)); });
            If(xN.y.lessThan(wallMin.y), () => { particleVelocity.y.addAssign(wallMin.y.sub(xN.y).mul(wallStiffness)); });
            If(xN.y.greaterThan(wallMax.y), () => { particleVelocity.y.addAssign(wallMax.y.sub(xN.y).mul(wallStiffness)); });
            If(xN.z.lessThan(wallMin.z), () => { particleVelocity.z.addAssign(wallMin.z.sub(xN.z).mul(wallStiffness)); });
            If(xN.z.greaterThan(wallMax.z), () => { particleVelocity.z.addAssign(wallMax.z.sub(xN.z).mul(wallStiffness)); });

            this.positionBuffer.element(instanceIndex).assign(particlePosition)
            this.velocityBuffer.element(instanceIndex).assign(particleVelocity)

        })().debug().compute(this.numParticles);
    }

    async update(interval, elapsed) {
        await this.renderer.computeAsync(this.kernels.clearGrid);
        await this.renderer.computeAsync(this.kernels.p2g1);
        await this.renderer.computeAsync(this.kernels.p2g2);


        await this.renderer.computeAsync(this.kernels.updateGrid);

        await this.renderer.computeAsync(this.kernels.g2p);
        //console.log(this.cellBufferMass, this.renderer.backend.get(this.cellBufferMass.value));
        //const result = new Int32Array(await this.renderer.getArrayBufferAsync(this.cellBufferMass.value));
        //console.log(result);
    }

}

export default mlsMpmSimulator;