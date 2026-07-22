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
export const BUILDINGS: Building[] = [
  { id: 'bldg_001', name: 'Main Building', code: 'MB', campus: 'Gordon College' },
  { id: 'bldg_002', name: 'College of Computer Studies Building', code: 'CCS', campus: 'Gordon College' },
  { id: 'bldg_003', name: 'College of Business Administration Building', code: 'CBA', campus: 'Gordon College' },
  { id: 'bldg_004', name: 'College of Education Building', code: 'CE', campus: 'Gordon College' },
  { id: 'bldg_005', name: 'College of Hospitality Building', code: 'CHTM', campus: 'Gordon College' },
  { id: 'bldg_006', name: 'College of Allied Health Building', code: 'CAHS', campus: 'Gordon College' },
  { id: 'bldg_007', name: 'Administration Building', code: 'AD', campus: 'Gordon College' },
  { id: 'bldg_008', name: 'Library Building', code: 'LIB', campus: 'Gordon College' },
  { id: 'bldg_009', name: 'Student Center', code: 'SC', campus: 'Gordon College' },
  { id: 'bldg_010', name: 'Gymnasium', code: 'GYM', campus: 'Gordon College' },
];

// Gordon College Rooms
export const ROOMS: Room[] = [
  // Main Building
  { id: 'rm_001', name: 'Room 101', number: '101', buildingId: 'bldg_001', buildingName: 'Main Building', floor: '1', type: 'classroom' },
  { id: 'rm_002', name: 'Room 102', number: '102', buildingId: 'bldg_001', buildingName: 'Main Building', floor: '1', type: 'classroom' },
  { id: 'rm_003', name: 'Room 103', number: '103', buildingId: 'bldg_001', buildingName: 'Main Building', floor: '1', type: 'classroom' },
  { id: 'rm_004', name: 'Room 201', number: '201', buildingId: 'bldg_001', buildingName: 'Main Building', floor: '2', type: 'classroom' },
  { id: 'rm_005', name: 'Room 202', number: '202', buildingId: 'bldg_001', buildingName: 'Main Building', floor: '2', type: 'classroom' },
  // CCS Building
  { id: 'rm_006', name: 'Computer Lab 1', number: 'CL1', buildingId: 'bldg_002', buildingName: 'College of Computer Studies Building', floor: '1', type: 'laboratory' },
  { id: 'rm_007', name: 'Computer Lab 2', number: 'CL2', buildingId: 'bldg_002', buildingName: 'College of Computer Studies Building', floor: '1', type: 'laboratory' },
  { id: 'rm_008', name: 'Computer Lab 3', number: 'CL3', buildingId: 'bldg_002', buildingName: 'College of Computer Studies Building', floor: '2', type: 'laboratory' },
  { id: 'rm_009', name: 'CCS Faculty Room', number: 'FR1', buildingId: 'bldg_002', buildingName: 'College of Computer Studies Building', floor: '3', type: 'office' },
  // CBA Building
  { id: 'rm_010', name: 'Room 301', number: '301', buildingId: 'bldg_003', buildingName: 'College of Business Administration Building', floor: '1', type: 'classroom' },
  { id: 'rm_011', name: 'Room 302', number: '302', buildingId: 'bldg_003', buildingName: 'College of Business Administration Building', floor: '1', type: 'classroom' },
  { id: 'rm_012', name: 'CBA Faculty Room', number: 'FR2', buildingId: 'bldg_003', buildingName: 'College of Business Administration Building', floor: '2', type: 'office' },
  // CHTM Building
  { id: 'rm_013', name: 'Kitchen Lab 1', number: 'KL1', buildingId: 'bldg_005', buildingName: 'College of Hospitality Building', floor: '1', type: 'laboratory' },
  { id: 'rm_014', name: 'Kitchen Lab 2', number: 'KL2', buildingId: 'bldg_005', buildingName: 'College of Hospitality Building', floor: '1', type: 'laboratory' },
  { id: 'rm_015', name: 'CHTM Faculty Room', number: 'FR3', buildingId: 'bldg_005', buildingName: 'College of Hospitality Building', floor: '2', type: 'office' },
  // CAHS Building
  { id: 'rm_016', name: 'Nursing Lab 1', number: 'NL1', buildingId: 'bldg_006', buildingName: 'College of Allied Health Building', floor: '1', type: 'laboratory' },
  { id: 'rm_017', name: 'Nursing Lab 2', number: 'NL2', buildingId: 'bldg_006', buildingName: 'College of Allied Health Building', floor: '1', type: 'laboratory' },
  { id: 'rm_018', name: 'CAHS Faculty Room', number: 'FR4', buildingId: 'bldg_006', buildingName: 'College of Allied Health Building', floor: '2', type: 'office' },
  // Administration Building
  { id: 'rm_019', name: 'Dean\'s Office', number: 'DO1', buildingId: 'bldg_007', buildingName: 'Administration Building', floor: '1', type: 'office' },
  { id: 'rm_020', name: 'Registrar Office', number: 'RO1', buildingId: 'bldg_007', buildingName: 'Administration Building', floor: '1', type: 'office' },
  { id: 'rm_021', name: 'Cashier Office', number: 'CO1', buildingId: 'bldg_007', buildingName: 'Administration Building', floor: '1', type: 'office' },
  // Library
  { id: 'rm_022', name: 'Main Library', number: 'LIB1', buildingId: 'bldg_008', buildingName: 'Library Building', floor: '1', type: 'other' },
  { id: 'rm_023', name: 'Library Computer Section', number: 'LCS1', buildingId: 'bldg_008', buildingName: 'Library Building', floor: '2', type: 'other' },
  // Student Center
  { id: 'rm_024', name: 'Student Lounge', number: 'SL1', buildingId: 'bldg_009', buildingName: 'Student Center', floor: '1', type: 'other' },
  { id: 'rm_025', name: 'Cafeteria', number: 'CAF1', buildingId: 'bldg_009', buildingName: 'Student Center', floor: '1', type: 'other' },
  // Gymnasium
  { id: 'rm_026', name: 'Main Gym', number: 'GYM1', buildingId: 'bldg_010', buildingName: 'Gymnasium', floor: '1', type: 'other' },
];

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
