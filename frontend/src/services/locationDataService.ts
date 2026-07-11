/**
 * Location Data Service
 * 
 * Provides centralized access to departments, rooms, and buildings data.
 * This service can be extended to fetch from Firestore in the future.
 */

export interface Department {
  id: string;
  name: string;
  code: string;
  college?: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  campus: string;
}

export interface Room {
  id: string;
  name: string;
  number: string;
  buildingId: string;
  buildingName: string;
  floor?: string;
  type?: 'classroom' | 'laboratory' | 'office' | 'auditorium' | 'other';
}

// Gordon College Departments
export const DEPARTMENTS: Department[] = [
  { id: 'dept_001', name: 'College of Computer Studies', code: 'CCS', college: 'Gordon College' },
  { id: 'dept_002', name: 'College of Allied Health Studies', code: 'CAHS', college: 'Gordon College' },
  { id: 'dept_003', name: 'College of Business Administration', code: 'CBA', college: 'Gordon College' },
  { id: 'dept_004', name: 'College of Education and Arts Studies', code: 'CEAS', college: 'Gordon College' },
  { id: 'dept_005', name: 'College of Hospitality and Tourism Management', code: 'CHTM', college: 'Gordon College' },
  { id: 'dept_006', name: 'Other', code: 'OTHER', college: 'Gordon College' },
];

// Gordon College Buildings
// TODO: Add actual building data when collected
export const BUILDINGS: Building[] = [];

// Gordon College Rooms
// TODO: Add actual room data when buildings are collected
export const ROOMS: Room[] = [];

class LocationDataService {
  /**
   * Get all departments
   */
  static getDepartments(): Department[] {
    return DEPARTMENTS;
  }

  /**
   * Get department by ID
   */
  static getDepartmentById(id: string): Department | undefined {
    return DEPARTMENTS.find(dept => dept.id === id);
  }

  /**
   * Get department by code
   */
  static getDepartmentByCode(code: string): Department | undefined {
    return DEPARTMENTS.find(dept => dept.code === code);
  }

  /**
   * Get all buildings
   */
  static getBuildings(): Building[] {
    return BUILDINGS;
  }

  /**
   * Get building by ID
   */
  static getBuildingById(id: string): Building | undefined {
    return BUILDINGS.find(bldg => bldg.id === id);
  }

  /**
   * Get building by code
   */
  static getBuildingByCode(code: string): Building | undefined {
    return BUILDINGS.find(bldg => bldg.code === code);
  }

  /**
   * Get all rooms
   */
  static getRooms(): Room[] {
    return ROOMS;
  }

  /**
   * Get rooms by building ID
   */
  static getRoomsByBuilding(buildingId: string): Room[] {
    return ROOMS.filter(room => room.buildingId === buildingId);
  }

  /**
   * Get room by ID
   */
  static getRoomById(id: string): Room | undefined {
    return ROOMS.find(room => room.id === id);
  }

  /**
   * Get rooms by type
   */
  static getRoomsByType(type: Room['type']): Room[] {
    return ROOMS.filter(room => room.type === type);
  }

  /**
   * Search rooms by name or number
   */
  static searchRooms(query: string): Room[] {
    const lowerQuery = query.toLowerCase();
    return ROOMS.filter(room => 
      room.name.toLowerCase().includes(lowerQuery) ||
      room.number.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get location summary for display
   */
  static getLocationSummary(roomId: string): string {
    const room = this.getRoomById(roomId);
    if (!room) return 'Unknown Location';
    
    const building = this.getBuildingById(room.buildingId);
    const buildingName = building ? building.name : room.buildingName;
    
    return `${room.name} (${buildingName})`;
  }
}

export default LocationDataService;
