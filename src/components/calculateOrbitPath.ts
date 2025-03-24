import { BaseItem } from './Canvas';
import { OrbitPoint } from './OrbitPathVisualization';

/**
 * Calculate the predicted orbit path for a planet
 * @param planet The planet to calculate the orbit for
 * @param allPlanets All planets in the simulation
 * @param G Gravitational constant
 * @param planetaryForces Whether to include forces between planets or only central body
 * @returns Array of points representing the orbit path
 */
export const calculateOrbitPath = (
  planet: BaseItem, 
  allPlanets: BaseItem[], 
  G: number,
  planetaryForces: boolean
): OrbitPoint[] => {
  // Return empty array if this is the central body (first planet)
  if (planet.id === allPlanets[0]?.id || allPlanets.length <= 1) {
    return [];
  }

  // Simulate the planet's trajectory to generate orbit path
  const orbitPoints: OrbitPoint[] = [];
  
  // Clone the planet to avoid modifying the original
  const simulatedPlanet = {
    ...planet,
    x: planet.x,
    y: planet.y,
    data: {
      ...planet.data,
      velocity: { ...planet.data.velocity }
    }
  };
  
  // Get the central planet (assumed to be the first one)
  const centralPlanet = allPlanets[0];

  // Add the current position as the first point
  const initialPoint = {
    x: planet.x + planet.width / 2,
    y: planet.y + planet.height / 2
  };
  orbitPoints.push(initialPoint);
  
  // Store initial velocity direction for orbit completion detection
  const initialVelocity = {
    x: planet.data.velocity.x,
    y: planet.data.velocity.y
  };
  const initialVelocityMagnitude = Math.sqrt(
    initialVelocity.x * initialVelocity.x + 
    initialVelocity.y * initialVelocity.y
  );
  
  // Use a smaller time step for more accurate simulation
  const timeStep = 0.05;
  
  // Limit the number of points to prevent infinite loops
  const MAX_POINTS = 2000;
  
  // Track orbit completion metrics
  let crossedStartingLine = false;
  let directionChanges = 0;
  let lastSignX = Math.sign(simulatedPlanet.data.velocity.x);
  let lastSignY = Math.sign(simulatedPlanet.data.velocity.y);
  
  // For better orbit prediction, we'll use a 4th-order Runge-Kutta integrator
  // First, define a function to calculate forces and acceleration
  const calculateAcceleration = (posX: number, posY: number, velX: number, velY: number) => {
    let totalForceX = 0;
    let totalForceY = 0;
    
    allPlanets.forEach(otherPlanet => {
      if (otherPlanet.id === simulatedPlanet.id) return;
      
      // When planetaryForces is disabled, only consider the central body
      const isCentralPlanet = otherPlanet.id === centralPlanet.id;
      if (!planetaryForces && !isCentralPlanet) return;
      
      // Get center position of the other planet
      const otherX = otherPlanet.x + otherPlanet.width / 2;
      const otherY = otherPlanet.y + otherPlanet.height / 2;
      
      // Calculate distance
      const dx = otherX - posX;
      const dy = otherY - posY;
      const distanceSquared = dx * dx + dy * dy;
      
      // Avoid division by zero and very close approaches
      if (distanceSquared < Math.max(otherPlanet.width, planet.width) * 2) return;
      
      // Calculate force using Newton's law of gravitation
      const distance = Math.sqrt(distanceSquared);
      const force = G * simulatedPlanet.data.mass * otherPlanet.data.mass / distanceSquared;
      
      // Add force components
      totalForceX += force * dx / distance;
      totalForceY += force * dy / distance;
    });
    
    // Calculate acceleration (F = ma, so a = F/m)
    return {
      ax: totalForceX / simulatedPlanet.data.mass,
      ay: totalForceY / simulatedPlanet.data.mass
    };
  };
  
  // Simulate future positions using RK4 integration
  for (let i = 0; i < MAX_POINTS; i++) {
    // Current state
    const posX = simulatedPlanet.x + simulatedPlanet.width / 2;
    const posY = simulatedPlanet.y + simulatedPlanet.height / 2;
    const velX = simulatedPlanet.data.velocity.x;
    const velY = simulatedPlanet.data.velocity.y;
    
    // RK4 integration steps
    // k1
    const k1 = calculateAcceleration(posX, posY, velX, velY);
    const k1_ax = k1.ax;
    const k1_ay = k1.ay;
    
    // k2
    const k2 = calculateAcceleration(
      posX + velX * timeStep / 2, 
      posY + velY * timeStep / 2,
      velX + k1_ax * timeStep / 2,
      velY + k1_ay * timeStep / 2
    );
    const k2_ax = k2.ax;
    const k2_ay = k2.ay;
    
    // k3
    const k3 = calculateAcceleration(
      posX + velX * timeStep / 2 + k1_ax * timeStep * timeStep / 4, 
      posY + velY * timeStep / 2 + k1_ay * timeStep * timeStep / 4,
      velX + k2_ax * timeStep / 2,
      velY + k2_ay * timeStep / 2
    );
    const k3_ax = k3.ax;
    const k3_ay = k3.ay;
    
    // k4
    const k4 = calculateAcceleration(
      posX + velX * timeStep + k2_ax * timeStep * timeStep / 2,
      posY + velY * timeStep + k2_ay * timeStep * timeStep / 2,
      velX + k3_ax * timeStep,
      velY + k3_ay * timeStep
    );
    const k4_ax = k4.ax;
    const k4_ay = k4.ay;
    
    // Final integration
    const newVelX = velX + (k1_ax + 2 * k2_ax + 2 * k3_ax + k4_ax) * timeStep / 6;
    const newVelY = velY + (k1_ay + 2 * k2_ay + 2 * k3_ay + k4_ay) * timeStep / 6;
    const newPosX = posX + (velX + newVelX) * timeStep / 2 - simulatedPlanet.width / 2;
    const newPosY = posY + (velY + newVelY) * timeStep / 2 - simulatedPlanet.height / 2;
    
    // Update the simulated planet
    simulatedPlanet.x = newPosX;
    simulatedPlanet.y = newPosY;
    simulatedPlanet.data.velocity.x = newVelX;
    simulatedPlanet.data.velocity.y = newVelY;
    
    // Add new point to the orbit path
    const newPoint = {
      x: newPosX + simulatedPlanet.width / 2,
      y: newPosY + simulatedPlanet.height / 2
    };
    orbitPoints.push(newPoint);
    
    // Check for direction changes (to detect orbit completion)
    const currentSignX = Math.sign(simulatedPlanet.data.velocity.x);
    const currentSignY = Math.sign(simulatedPlanet.data.velocity.y);
    
    if (currentSignX !== lastSignX || currentSignY !== lastSignY) {
      directionChanges++;
      lastSignX = currentSignX;
      lastSignY = currentSignY;
    }
    
    // Detect if we've completed an orbit
    if (i > 50) { // Only check after we've generated enough points
      // Calculate distance from the starting point
      const distanceFromStart = Math.sqrt(
        Math.pow(newPoint.x - initialPoint.x, 2) + 
        Math.pow(newPoint.y - initialPoint.y, 2)
      );
      
      // Calculate current velocity
      const currentVelocity = {
        x: simulatedPlanet.data.velocity.x,
        y: simulatedPlanet.data.velocity.y
      };
      const currentVelocityMagnitude = Math.sqrt(
        currentVelocity.x * currentVelocity.x + 
        currentVelocity.y * currentVelocity.y
      );
      
      // Dot product to check angle between initial and current velocity vectors
      const dotProduct = 
        (initialVelocity.x * currentVelocity.x + initialVelocity.y * currentVelocity.y) / 
        (initialVelocityMagnitude * currentVelocityMagnitude);
      
      // Check if we're close to the starting point AND moving in approximately the same direction
      // and have gone through at least 4 direction changes (crossing x and y axes twice)
      if (distanceFromStart < planet.width * 2 && dotProduct > 0.9 && directionChanges >= 4) {
        // We've completed an orbit
        break;
      }
      
      // If we've gone too far from the starting position, this might not be a stable orbit
      // Let's cap the maximum distance to avoid strange paths
      const distanceToCentral = Math.sqrt(
        Math.pow(newPoint.x - (centralPlanet.x + centralPlanet.width/2), 2) + 
        Math.pow(newPoint.y - (centralPlanet.y + centralPlanet.height/2), 2)
      );
      
      const initialDistanceToCentral = Math.sqrt(
        Math.pow(initialPoint.x - (centralPlanet.x + centralPlanet.width/2), 2) + 
        Math.pow(initialPoint.y - (centralPlanet.y + centralPlanet.height/2), 2)
      );
      
      // If the planet is moving away significantly, stop prediction
      if (distanceToCentral > initialDistanceToCentral * 3) {
        break;
      }
    }
  }
  
  return orbitPoints;
};  