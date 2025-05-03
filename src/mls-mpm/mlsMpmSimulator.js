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
    vec4,
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
    NodeAccess, mx_cell_noise_float, cross, mix, mx_hsvtorgb, select, ivec3
} from "three/tsl";
import {triNoise3Dvec} from "../common/noise";
import {conf} from "../conf";

const stiffness = 3.;
const restDensity = 1.;
const dynamicViscosity = 0.1;

class mlsMpmSimulator {
    renderer = null;
    numParticles = 0;
    gridSize = new THREE.Vector3(0,0,0);
    gridCellSize = new THREE.Vector3(0,0,0);
    uniforms = {};
    kernels = {};
    fixedPointMultiplier = 1e7;
    mousePos = new THREE.Vector3();
    mousePosArray = [];

    constructor(renderer) {
        this.renderer = renderer;
    }
    async init() {
        const {maxParticles} = conf;
        this.gridSize.set(64,64,64);

        this.particleArray = new Float32Array(maxParticles * 4);
        const vec = new THREE.Vector3();
        for (let i = 0; i < maxParticles; i++) {
            let dist = 2;
            while (dist > 1) {
                vec.set(Math.random(),Math.random(),Math.random()).multiplyScalar(2.0).subScalar(1.0);
                dist = vec.length();
                vec.multiplyScalar(0.8).addScalar(1.0).divideScalar(2.0).multiply(this.gridSize);
                this.particleArray[i*4+0] = vec.x;
                this.particleArray[i*4+1] = vec.y;
                this.particleArray[i*4+2] = vec.z;
            }
            this.particleArray[i*4+3] = 1.0 - Math.random() * 0.002; // random Mass
        }
        /*for (let i = 1; i <= 22; i++) {
            this.positionArray[i*3+0] = this.positionArray[0];
            this.positionArray[i*3+1] = this.positionArray[1];
            this.positionArray[i*3+2] = this.positionArray[2];
        }*/


        const particleStruct = struct( {
            position: { type: 'vec3' },
            density: { type: 'float' },
            velocity: { type: 'vec3' },
            mass: { type: 'float' },
            C: { type: 'mat3' },
            direction: { type: 'vec3' },
            color: { type: 'vec3' },
        } );

        this.initialParticleBuffer = instancedArray(this.particleArray, "vec4").label("initialParticleBuffer");
        this.particleBuffer = instancedArray(maxParticles, particleStruct).label('particleData');
        this.particleBuffer.value.usage = GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX;
        console.log(this.particleBuffer);

        /*this.densityBuffer = instancedArray(maxParticles, "float").label("particleDensityBuffer");
        this.velocityBuffer = instancedArray(maxParticles, "vec3").label("particleVelocityBuffer");
        this.directionBuffer = instancedArray(maxParticles, "vec3").label("particleDirectionBuffer");
        this.colorBuffer = instancedArray(maxParticles, "vec3").label("particleColorBuffer");
        this.CBuffer = instancedArray(maxParticles, "mat3").label("particleCBuffer");*/

        const cellCount = this.gridSize.x * this.gridSize.y * this.gridSize.z;
        const cellStruct = struct( {
            x: { type: 'int', atomic: true },
            y: { type: 'int', atomic: true },
            z: { type: 'int', atomic: true },
            mass: { type: 'int', atomic: true },
        } );
        this.cellBuffer = instancedArray(cellCount, cellStruct).setPBO(true).label('cellData');
        this.cellBufferF = instancedArray(cellCount, 'vec4').label('cellDataF');
        this.cellBuffer.value.usage = GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX;
        this.cellBufferF.value.usage = GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX;

        this.uniforms.gravity = uniform(0, "uint");
        this.uniforms.stiffness = uniform(0);
        this.uniforms.restDensity = uniform(0);
        this.uniforms.dynamicViscosity = uniform(0);
        this.uniforms.noise = uniform(0);

        this.uniforms.gridSize = uniform(this.gridSize, "ivec3");
        this.uniforms.gridCellSize = uniform(this.gridCellSize);
        this.uniforms.dt = uniform(0.1);
        this.uniforms.numParticles = uniform(0, "uint");

        this.uniforms.mouseRayDirection = uniform(new THREE.Vector3());
        this.uniforms.mouseRayOrigin = uniform(new THREE.Vector3());
        this.uniforms.mouseForce = uniform(new THREE.Vector3());


        this.kernels.populate = Fn(() => {
            If(instanceIndex.greaterThanEqual(uint(maxParticles)), () => {
                Return();
            });
            const value = this.initialParticleBuffer.element(instanceIndex);
            this.particleBuffer.element(instanceIndex).get('position').assign(value.xyz);
            this.particleBuffer.element(instanceIndex).get('mass').assign(value.w);
        })().compute(maxParticles);
        await this.renderer.computeAsync(this.kernels.populate);

        this.kernels.clearGrid = Fn(() => {
            this.cellBuffer.structTypeNode.membersLayout[0].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[1].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[2].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[3].atomic = false;
            this.cellBuffer.setAccess(THREE.NodeAccess.READ_WRITE);

            If(instanceIndex.greaterThanEqual(uint(cellCount)), () => {
                Return();
            });

            this.cellBuffer.element(instanceIndex).get('x').assign(0);
            this.cellBuffer.element(instanceIndex).get('y').assign(0);
            this.cellBuffer.element(instanceIndex).get('z').assign(0);
            this.cellBuffer.element(instanceIndex).get('mass').assign(0);
            this.cellBufferF.element(instanceIndex).assign(0);
            /*atomicStore(this.cellBufferMass.element(instanceIndex), int(0));
            atomicStore(this.cellBufferVx.element(instanceIndex), 0);
            atomicStore(this.cellBufferVy.element(instanceIndex), 0);
            atomicStore(this.cellBufferVz.element(instanceIndex), 0);*/
        })().compute(cellCount);

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

            this.particleBuffer.setAccess(THREE.NodeAccess.READ_ONLY);
            this.cellBuffer.setAccess(THREE.NodeAccess.READ_WRITE);

            If(instanceIndex.greaterThanEqual(uint(this.uniforms.numParticles)), () => {
                Return();
            });
            const gridSize = this.uniforms.gridSize;
            const particlePosition = this.particleBuffer.element(instanceIndex).get('position').xyz;
            const particleVelocity = this.particleBuffer.element(instanceIndex).get('velocity').xyz;

            const cellIndex =  ivec3(particlePosition).sub(1).toConst("cellIndex");
            const cellDiff = particlePosition.fract().sub(0.5).toConst("cellDiff");
            const w0 = float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff));
            const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
            const w2 = float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff));
            const weights = array([w0,w1,w2]).toConst("weights");

            const C = this.particleBuffer.element(instanceIndex).get('C').toConst();
            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(ivec3(gx,gy,gz)).toConst();
                        const cellDist = vec3(cellX).add(0.5).sub(particlePosition).toConst("cellDist");
                        const Q = C.mul(cellDist);

                        const massContrib = weight; // assuming particle mass = 1.0
                        const velContrib = massContrib.mul(particleVelocity.add(Q)).toConst("velContrib");
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toConst("cellPtr");
                        atomicAdd(this.cellBuffer.element(cellPtr).get('x'), encodeFixedPoint(velContrib.x));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('y'), encodeFixedPoint(velContrib.y));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('z'), encodeFixedPoint(velContrib.z));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('mass'), encodeFixedPoint(massContrib));
                    });
                });
            });
        })().compute(1);


        this.kernels.p2g2 = Fn(() => {
            this.cellBuffer.structTypeNode.membersLayout[0].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[1].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[2].atomic = true;
            this.cellBuffer.structTypeNode.membersLayout[3].atomic = false;
            this.particleBuffer.setAccess(THREE.NodeAccess.READ_WRITE);
            this.cellBuffer.setAccess(THREE.NodeAccess.READ_WRITE);

            If(instanceIndex.greaterThanEqual(uint(this.uniforms.numParticles)), () => {
                Return();
            });
            const gridSize = this.uniforms.gridSize;
            const particlePosition = this.particleBuffer.element(instanceIndex).get('position').xyz;
            //const particleVelocity = this.velocityBuffer.element(instanceIndex).xyz;

            const cellIndex =  ivec3(particlePosition).sub(1).toConst("cellIndex");
            const cellDiff = particlePosition.fract().sub(0.5).toConst("cellDiff");
            const w0 = float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff));
            const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
            const w2 = float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff));
            const weights = array([w0,w1,w2]).toConst("weights");

            const density = float(0).toVar("density");
            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(ivec3(gx,gy,gz)).toConst();
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toConst("cellPtr");
                        density.addAssign(decodeFixedPoint(this.cellBuffer.element(cellPtr).get('mass')).mul(weight));
                    });
                });
            });
            const densityStore = this.particleBuffer.element(instanceIndex).get('density');
            //this.densityBuffer.element(instanceIndex).assign(densityStore.mul(0.75).add(density.mul(0.25)));
            densityStore.assign(mix(densityStore, density, 0.05));

            const volume = float(1).div(density);
            const pressure = max(0.0, pow(density.div(this.uniforms.restDensity), 5.0).sub(1).mul(this.uniforms.stiffness)).toConst('pressure');
            const stress = mat3(pressure.negate(), 0, 0, 0, pressure.negate(), 0, 0, 0, pressure.negate()).toVar('stress');
            const dudv = this.particleBuffer.element(instanceIndex).get('C');

            const strain = dudv.add(dudv.transpose());
            stress.addAssign(strain.mul(this.uniforms.dynamicViscosity));
            const eq16Term0 = volume.mul(-4).mul(stress).mul(this.uniforms.dt);

            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(ivec3(gx,gy,gz)).toConst();
                        const cellDist = vec3(cellX).add(0.5).sub(particlePosition).toConst("cellDist");
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toConst("cellPtr2");

                        const momentum = eq16Term0.mul(weight).mul(cellDist).toConst("momentum");
                        atomicAdd(this.cellBuffer.element(cellPtr).get('x'), encodeFixedPoint(momentum.x));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('y'), encodeFixedPoint(momentum.y));
                        atomicAdd(this.cellBuffer.element(cellPtr).get('z'), encodeFixedPoint(momentum.z));
                    });
                });
            });
        })().compute(1);



        this.kernels.updateGrid = Fn(() => {
            this.cellBuffer.structTypeNode.membersLayout[0].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[1].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[2].atomic = false;
            this.cellBuffer.structTypeNode.membersLayout[3].atomic = false;
            this.cellBuffer.setAccess(THREE.NodeAccess.READ_ONLY);
            this.cellBufferF.setAccess(THREE.NodeAccess.READ_WRITE);

            If(instanceIndex.greaterThanEqual(uint(cellCount)), () => {
                Return();
            });
            const mass = decodeFixedPoint(this.cellBuffer.element(instanceIndex).get('mass')).toConst();
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
            this.cellBufferF.element(instanceIndex).assign(vec4(vx,vy,vz,mass));
        })().compute(cellCount);

        this.kernels.g2p = Fn(() => {
            this.particleBuffer.setAccess(THREE.NodeAccess.READ_WRITE);
            this.cellBufferF.setAccess(THREE.NodeAccess.READ_ONLY);
            If(instanceIndex.greaterThanEqual(uint(this.uniforms.numParticles)), () => {
                Return();
            });
            const gridSize = this.uniforms.gridSize;
            const particleMass = this.particleBuffer.element(instanceIndex).get('mass').toConst("particleMass");
            const particleDensity = this.particleBuffer.element(instanceIndex).get('density').toConst("particleDensity");
            const particlePosition = this.particleBuffer.element(instanceIndex).get('position').xyz.toVar("particlePosition");
            const particleVelocity = vec3(0).toVar();
            If(this.uniforms.gravity.equal(uint(2)), () => {
                const pn = particlePosition.div(vec3(this.uniforms.gridSize.sub(1))).sub(0.5).normalize().toConst();
                particleVelocity.subAssign(pn.mul(0.3).mul(this.uniforms.dt));
            }).Else(() => {
                const gravity = select(this.uniforms.gravity.equal(uint(0)), vec3(0,0,0.2), vec3(0,-0.2,0));
                particleVelocity.addAssign(gravity.mul(this.uniforms.dt));
            });


            /*const noise = vec3(
                triNoise3D(particlePosition.mul(0.015), time, 0.21),
                triNoise3D(particlePosition.yzx.mul(0.015), time, 0.22),
                triNoise3D(particlePosition.zxy.mul(0.015), time, 0.23)
            ).sub(0.285).normalize().mul(0.15).toVar();*/
            const noise = triNoise3Dvec(particlePosition.mul(0.015), time, 0.11).sub(0.285).normalize().mul(0.28).toVar();
            particleVelocity.subAssign(noise.mul(this.uniforms.noise).mul(this.uniforms.dt));

            /*const dither = vec3(hash(instanceIndex),hash(instanceIndex.add(1337)),hash(instanceIndex.add(2337))).mul(0.0001);
            particleVelocity.addAssign(dither)*/

            const cellIndex =  ivec3(particlePosition).sub(1).toConst("cellIndex");
            const cellDiff = particlePosition.fract().sub(0.5).toConst("cellDiff");

            const w0 = float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff));
            const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
            const w2 = float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff));
            const weights = array([w0,w1,w2]).toConst("weights");

            const B = mat3(0).toVar("B");
            Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({gx}) => {
                Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({gy}) => {
                    Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({gz}) => {
                        const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
                        const cellX = cellIndex.add(ivec3(gx,gy,gz)).toConst();
                        const cellDist = vec3(cellX).add(0.5).sub(particlePosition).toConst("cellDist");
                        const cellPtr = int(cellX.x).mul(gridSize.y).mul(gridSize.z).add(int(cellX.y).mul(gridSize.z)).add(int(cellX.z)).toConst("cellPtr");

                        const weightedVelocity = this.cellBufferF.element(cellPtr).xyz.mul(weight).toConst("weightedVelocity");
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

            const dist = cross(this.uniforms.mouseRayDirection, particlePosition.mul(vec3(1,1,0.4)).sub(this.uniforms.mouseRayOrigin)).length()
            const force = dist.mul(0.1).oneMinus().max(0.0).pow(2);
            //particleVelocity.assign(mix(particleVelocity, this.uniforms.mouseForce.mul(6), force));
            particleVelocity.addAssign(this.uniforms.mouseForce.mul(1).mul(force));
            particleVelocity.mulAssign(particleMass); // to ensure difference between particles


            this.particleBuffer.element(instanceIndex).get('C').assign(B.mul(4));
            particlePosition.addAssign(particleVelocity.mul(this.uniforms.dt));
            particlePosition.assign(clamp(particlePosition, vec3(2), this.uniforms.gridSize.sub(2)));

            const wallStiffness = 0.3;
            const xN = particlePosition.add(particleVelocity.mul(this.uniforms.dt).mul(3.0)).toConst("xN");
            const wallMin = vec3(3).toConst("wallMin");
            const wallMax = vec3(this.uniforms.gridSize).sub(3).toConst("wallMax");
            If(xN.x.lessThan(wallMin.x), () => { particleVelocity.x.addAssign(wallMin.x.sub(xN.x).mul(wallStiffness)); });
            If(xN.x.greaterThan(wallMax.x), () => { particleVelocity.x.addAssign(wallMax.x.sub(xN.x).mul(wallStiffness)); });
            If(xN.y.lessThan(wallMin.y), () => { particleVelocity.y.addAssign(wallMin.y.sub(xN.y).mul(wallStiffness)); });
            If(xN.y.greaterThan(wallMax.y), () => { particleVelocity.y.addAssign(wallMax.y.sub(xN.y).mul(wallStiffness)); });
            If(xN.z.lessThan(wallMin.z), () => { particleVelocity.z.addAssign(wallMin.z.sub(xN.z).mul(wallStiffness)); });
            If(xN.z.greaterThan(wallMax.z), () => { particleVelocity.z.addAssign(wallMax.z.sub(xN.z).mul(wallStiffness)); });

            this.particleBuffer.element(instanceIndex).get('position').assign(particlePosition)
            this.particleBuffer.element(instanceIndex).get('velocity').assign(particleVelocity)


            const direction = this.particleBuffer.element(instanceIndex).get('direction');
            direction.assign(mix(direction,particleVelocity, 0.1));

            const color = mx_hsvtorgb(vec3(particleDensity.div(this.uniforms.restDensity).mul(0.25).add(time.mul(0.05)), particleVelocity.length().mul(0.5).clamp(0,1).mul(0.3).add(0.7), force.mul(0.3).add(0.7)));
            this.particleBuffer.element(instanceIndex).get('color').assign(color);

        })().compute(1);
    }

    setMouseRay(origin, direction, pos) {
        origin.multiplyScalar(64);
        pos.multiplyScalar(64);
        //direction.setZ(direction.z / 0.4);
        origin.add(new THREE.Vector3(32,0,0));
        this.uniforms.mouseRayDirection.value.copy(direction.normalize());
        this.uniforms.mouseRayOrigin.value.copy(origin);
        this.mousePos.copy(pos);
    }

    async update(interval, elapsed, framenum) {
        const { particles, run, noise, dynamicViscosity, stiffness, restDensity, speed, gravity } = conf;

        this.uniforms.noise.value = noise;
        this.uniforms.stiffness.value = stiffness;
        this.uniforms.gravity.value = gravity;
        this.uniforms.dynamicViscosity.value = dynamicViscosity;
        this.uniforms.restDensity.value = restDensity;

        if (particles !== this.numParticles) {
            this.numParticles = particles;
            this.uniforms.numParticles.value = particles;
            this.kernels.p2g1.count = particles;
            this.kernels.p2g1.updateDispatchCount();
            this.kernels.p2g2.count = particles;
            this.kernels.p2g2.updateDispatchCount();
            this.kernels.g2p.count = particles;
            this.kernels.g2p.updateDispatchCount();
        }


        interval = Math.min(interval, 1/60);
        const dt = interval * 6 * speed;
        this.uniforms.dt.value = dt;


        this.mousePosArray.push(this.mousePos.clone())
        if (this.mousePosArray.length > 3) { this.mousePosArray.shift(); }
        //this.mousePos.set(0,0,0);
        if (this.mousePosArray.length > 1) {
            this.uniforms.mouseForce.value.copy(this.mousePosArray[this.mousePosArray.length - 1]).sub(this.mousePosArray[0]).divideScalar(this.mousePosArray.length);
        }


        if (run) {
            for (let i = 0; i < 1; i++) {
                const kernels = [this.kernels.clearGrid, this.kernels.p2g1, this.kernels.p2g2, this.kernels.updateGrid, this.kernels.g2p];
                await this.renderer.computeAsync(kernels);
                /*await this.renderer.computeAsync(this.kernels.clearGrid);
                await this.renderer.computeAsync(this.kernels.p2g1);
                await this.renderer.computeAsync(this.kernels.p2g2);
                await this.renderer.computeAsync(this.kernels.updateGrid);
                await this.renderer.computeAsync(this.kernels.g2p);*/
            }
        }

        //console.log(this.cellBufferMass, this.renderer.backend.get(this.cellBufferMass.value));
        //const result = new Int32Array(await this.renderer.getArrayBufferAsync(this.cellBufferMass.value));
        //console.log(result);
    }

}

export default mlsMpmSimulator;