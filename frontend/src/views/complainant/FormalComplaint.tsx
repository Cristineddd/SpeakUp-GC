import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Upload, 
  Calendar, 
  MapPin, 
  User, 
  Shield, 
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  Clock,
  Building,
  Phone,
  Mail,
  Cloud
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { useToast } from "../../hooks/use-toast";
import { useNavigate } from "../../compat/router";
import { useAuth } from "../../contexts/AuthContext";
import { ComplaintFormData, ComplaintType, PersonType, HarassmentDegree } from "../../types/complaints";
import { FORMAL_COMPLAINT_CATEGORIES } from "../../constants/formalComplaintCategories";
import { collection, addDoc, Timestamp, doc, updateDoc, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { NotificationService } from '../../services/notificationService';
import { RepresentativeService } from '../../services/representativeService';
import LocationMapPicker from "../../components/forms/LocationMapPicker";
import { FormTip, FormStepHeader, FormTipsList } from "../../components/forms/FormAssistant";
import { getFormSuggestions, getStepTip, validateFormCompletion, getEncouragingMessage } from "../../services/formAssistant.service";
import { EvidenceSubmissionModal, EvidenceData } from "../../components/modals/EvidenceSubmissionModal";
import { generateAIResponse } from "../../services/gemini.service";
import { sanitizePhMobileInput, validatePhMobile, isValidPhMobile } from "../../utils/phoneValidation";

// ✅ SAFE CLOUDINARY CONFIG 
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

// Olongapo City and Zambales locations data
const LOCATIONS = {
  "Olongapo City": [
    "Asinan Poblacion", "Asinan Proper", "Banicain", "Barreto", "East Bajac-Bajac",
    "East Tapinac", "Gordon Heights", "Kalaklan", "Mabayuan", "New Cabalan",
    "New Ilalim", "New Kababae", "New Kalalake", "Old Cabalan", "Pag-asa",
    "Santa Rita", "West Bajac-Bajac", "West Tapinac"
  ],
  "Zambales - Botolan": [
    "Bangan", "Batonlapoc", "Beneg", "Binuclutan", "Cabatuan", "Capayawan",
    "Carael", "Danacbunga", "Maguisguis", "Malomboy", "Mambog", "Moraza",
    "Paco (Pob.)", "Palis", "Paudpod", "Porac", "Salaza", "San Isidro",
    "San Juan", "San Miguel", "Taguisa", "Tampo (Pob.)", "Villar", "Belbel"
  ],
  "Zambales - Cabangan": [
    "Anonang", "Banuambayo", "Cadmang-Reserva", "Camiling", "Felmida-Diaz",
    "Laoag", "Lomboy", "Looc-Bato", "New San Jose", "Paite", "Poonbato",
    "San Juan (Pob.)", "San Narciso", "Santa Rita", "Tondo"
  ],
  "Zambales - Candelaria": [
    "Amlongan", "Bolitoc", "Catol", "Libertador", "Malabon", "Malimanga",
    "Palmayo", "Panian", "Poblacion", "San Isidro", "Tapuac", "Uacon"
  ],
  "Zambales - Castillejos": [
    "Balaybay", "Buenavista", "Del Pilar", "Looc", "Magsaysay", "Nagbayan",
    "Nagbunga", "Nagpandayan", "Poblacion", "San Agustin", "San Juan",
    "San Roque", "Santa Maria"
  ],
  "Zambales - Iba (Capital)": [
    "Amungan", "Dirita-Baloguen", "Lipay-Dingin-Panibuatan", "Palanginan",
    "San Agustin", "Santa Barbara", "Santo Rosario (Pob.)", "Zone 1 Pob. (Libaba)",
    "Zone 2 Pob. (Aypa)", "Zone 3 Pob. (Botlay)", "Zone 4 Pob. (Sagapan)",
    "Zone 5 Pob. (Bano)", "Zone 6 Pob. (Baytan)"
  ],
  "Zambales - Masinloc": [
    "Baloganon", "Bamban", "Bani", "Collat", "Inhobol", "North Poblacion",
    "San Lorenzo", "San Salvador", "Santa Rita", "Santo Rosario", "South Poblacion",
    "Taltal", "Tapuac"
  ],
  "Zambales - Palauig": [
    "Alwa", "Bato", "Bulawen", "Cauyan", "East Poblacion", "Garreta",
    "Laoag", "Libaba", "Liwa-liwa", "Locloc", "Magalawa", "Pangolinan",
    "Salaza", "San Juan", "Tition", "Tiza", "West Poblacion"
  ],
  "Zambales - San Antonio": [
    "Antipolo", "Babilao", "Burgos", "Calvario", "Camiing", "Estanza",
    "Lipay", "Luna", "Pundaquit", "San Gregorio", "San Juan", "Santa Rita",
    "Santo Rosario", "Talisay", "Villamar"
  ],
  "Zambales - San Felipe": [
    "Amagna", "Apostol", "Balincaguing", "Farañal", "Feria", "Maloma",
    "Manglicmot", "Poblacion", "Rosete", "San Rafael", "Sindol"
  ],
  "Zambales - San Marcelino": [
    "Aglao", "Buhawen", "Central", "Consuelo Norte", "Consuelo Sur",
    "Laoag", "Linasin", "Linusungan", "Lucero", "Nagbunga", "Poblacion",
    "Rabanes", "San Guillermo", "San Rafael", "Santa Fe"
  ],
  "Zambales - San Narciso": [
    "Alos", "Beddeng", "Buyon", "Dallipawen", "La Paz", "Namatacan",
    "Omaya", "Paite", "Pantay Almacen", "Pantay Daya", "Pantay Fatima",
    "Poblacion", "San Juan", "Santa Cruz", "Siminublan", "Tubol"
  ],
  "Zambales - Santa Cruz": [
    "Bolitoc", "Candelaria", "Gama", "Guinacot", "Lambingan", "Lipay",
    "Lucapon North", "Lucapon South", "Malabago", "Naulo", "Pagatpat",
    "Poblacion East", "Poblacion West", "Sabang", "San Fernando"
  ],
  "Zambales - Subic": [
    "Aningway Sacatihan", "Asinan Poblacion", "Asinan Proper", "Baraca-Camachile",
    "Calapacuan", "Cawag", "Ilwas", "Mangan-Vaca", "Matain", "Naugsol",
    "Pamatawan", "San Isidro", "Santo Tomas", "Wawandue (Pob.)"
  ],
  // Bataan Municipalities
  "Bataan - Balanga City (Capital)": [
    "Bagong Silang", "Bagumbayan", "Banco", "Cabog-Cabog", "Camacho",
    "Cataning", "Central", "Cupang North", "Cupang South", "Cupang West",
    "Dangcol", "Doña Francisca", "Ibayo", "Lote", "Malabia", "Munting Batangas",
    "Poblacion", "Pto. Rivas Ibaba", "Pto. Rivas Itaas", "Tuyo"
  ],
  "Bataan - Abucay": [
    "Bangkal", "Calaylayan", "Capitangan", "Gabon", "Laon", "Mabatang",
    "Omboy", "Palili", "Salian", "Wawa"
  ],
  "Bataan - Bagac": [
    "Atilano L. Ricardo", "Bagumbayan", "Banawang", "Binuangan", "Binukawan",
    "Ibaba", "Ibis", "Parang", "Paysawan", "Quinawan", "San Antonio",
    "Saysain", "Tabing-Ilog"
  ],
  "Bataan - Dinalupihan": [
    "Aming", "Aquino", "Bayan-bayanan", "Bonifacio", "Burgos", "Colo",
    "Daang Bago", "Dalao", "Gen. Luna", "Happy Valley", "Kataasan",
    "Layac", "Luacan", "Mabini Ext.", "Mabini Proper", "Magsaysay",
    "Naparing", "New San Jose", "Old San Jose", "Padre Dandan",
    "Pagalanggang", "Pita", "Poblacion", "Roosevelt", "Roxas", "Saguing",
    "San Benito", "San Isidro", "San Pablo", "San Ramon", "San Simon",
    "Santa Isabel", "Santo Niño", "Sapang Balas", "Tubo-tubo", "Torres Bugauen",
    "Tucop", "Zamora"
  ],
  "Bataan - Hermosa": [
    "A. Rivera", "Almacen", "Bacong", "Balsic", "Bamban", "Burgos-Soliman",
    "Cataning", "Cayabu", "Culis", "Daungan", "Mabiga", "Mabuco",
    "Maite", "Mandama", "Manibaug Liog", "Manibaug Pasig", "Masin",
    "Palihan", "Pandaguitan", "Pulo", "Saba", "Sacrifice Valley",
    "Sumalo", "Tipo"
  ],
  "Bataan - Limay": [
    "Alangan", "Duale", "Kitang I", "Kitang II & Luz", "Lamao",
    "Landing", "Poblacion", "Reformista", "Saint Francis II",
    "San Francisco de Asis", "Townsite", "Wawa"
  ],
  "Bataan - Mariveles": [
    "Alas-asin", "Alion", "Balon-Anito", "Bantay", "Batangas I",
    "Batangas II", "Biaan", "Cabcaben", "Camaya", "Ipag", "Lucanin",
    "Maligaya", "Mt. View", "Poblacion", "San Carlos", "San Isidro",
    "Sisiman", "Townsite"
  ],
  "Bataan - Morong": [
    "Binaritan", "Mabayo", "Nagbalayong", "Poblacion", "Sabang"
  ],
  "Bataan - Orani": [
    "Apollo", "Bagong Paraiso", "Balut", "Bayan", "Calero", "Centro I",
    "Centro II", "Dona", "Kabalutan", "Kaparangan", "Maria Fe", "Masantol",
    "Mulawin", "Pag-asa", "Palihan", "Pantalan Bago", "Pantalan Luma",
    "Parang Parang", "Puksuan", "Sibul", "Silahis", "Tagumpay", "Talimundoc",
    "Tapulao", "Tenejero", "Tugatog", "Wawa"
  ],
  "Bataan - Orion": [
    "Arellano", "Bagumbayan", "Balagtas", "Balut", "Bantan Munti",
    "Bilolo", "Calungusan", "Camachile", "Daang Bago", "Daang Bilang",
    "Daang Pare", "General Lim", "Kaput", "Lati", "Lucero", "Lusungan",
    "Puting Buhangin", "Sabatan", "San Vicente", "Santa Elena", "Santo Domingo",
    "Villa Angeles", "Wakas", "Wawa"
  ],
  "Bataan - Pilar": [
    "Ala-uli", "Bagumbayan", "Balut I", "Balut II", "Bantan Matanda",
    "Burgos", "Diwa", "Landing", "Liyang", "Nagwaling", "Panilao",
    "Pantingan", "Papaya", "Poblacion", "Rizal", "Santa Rosa",
    "Wakas North", "Wakas South", "Wawa"
  ],
  "Bataan - Samal": [
    "East Calaguiman", "East Daang Bago", "Gugo", "Ibaba", "Imelda",
    "Lalawigan", "Sapa", "Santa Lucia", "Sastre", "Tabing Ilog",
    "West Calaguiman", "West Daang Bago"
  ]
};

// Popular landmarks in Olongapo City and Zambales
const LANDMARKS: { [key: string]: string[] } = {
  "Olongapo City": [
    "SM City Olongapo",
    "Harbor Point Mall",
    "Rizal Triangle",
    "Olongapo City Hall",
    "Gordon College",
    "James L. Gordon Memorial Hospital",
    "St. James Parish Church",
    "Subic Bay Freeport Zone Gate",
    "Olongapo Sports Complex",
    "East Avenue Medical Center",
    "Olongapo City Market",
    "Magsaysay Drive",
    "Victory Liner Bus Terminal"
  ],
  "Zambales - Iba (Capital)": [
    "Capitol Building",
    "Iba Public Market",
    "Iba Town Plaza",
    "Iba Catholic Church",
    "Provincial Hospital of Zambales",
    "Victory Liner Terminal Iba"
  ],
  "Zambales - Botolan": [
    "Botolan Public Market",
    "Botolan Municipal Hall",
    "St. John the Baptist Church",
    "Mount Pinatubo Crater Lake (Trekking Point)"
  ],
  "Zambales - Cabangan": [
    "Cabangan Public Market",
    "Cabangan Municipal Hall",
    "St. Catherine of Alexandria Church"
  ],
  "Zambales - Candelaria": [
    "Candelaria Public Market",
    "Candelaria Municipal Hall",
    "Nuestra Señora de Candelaria Church"
  ],
  "Zambales - Castillejos": [
    "Castillejos Public Market",
    "Castillejos Municipal Hall",
    "St. William the Hermit Parish"
  ],
  "Zambales - Masinloc": [
    "Masinloc Public Market",
    "Masinloc Municipal Hall",
    "Our Lady of the Assumption Church",
    "Masinloc Port"
  ],
  "Zambales - Palauig": [
    "Palauig Public Market",
    "Palauig Municipal Hall",
    "St. Joseph the Worker Parish",
    "Magalawa Island Dock"
  ],
  "Zambales - San Antonio": [
    "San Antonio Public Market",
    "San Antonio Municipal Hall",
    "Pundaquit Beach",
    "Anawangin Cove (Jump-off Point)",
    "Nagsasa Cove (Jump-off Point)",
    "Capones Island Dock"
  ],
  "Zambales - San Felipe": [
    "San Felipe Public Market",
    "San Felipe Municipal Hall",
    "San Felipe Parish Church"
  ],
  "Zambales - San Marcelino": [
    "San Marcelino Public Market",
    "San Marcelino Municipal Hall",
    "St. Marcellinus Church"
  ],
  "Zambales - San Narciso": [
    "San Narciso Public Market",
    "San Narciso Municipal Hall",
    "San Narciso Beach"
  ],
  "Zambales - Santa Cruz": [
    "Santa Cruz Public Market",
    "Santa Cruz Municipal Hall",
    "Santa Cruz Beach",
    "Nagsasa Cove Access Road"
  ],
  "Zambales - Subic": [
    "Subic Public Market",
    "Subic Municipal Hall",
    "Subic Bay Boardwalk",
    "Subic Beach"
  ],
  // Bataan Landmarks
  "Bataan - Balanga City (Capital)": [
    "Balanga City Hall",
    "Capitol Compound",
    "Balanga Public Market",
    "Balanga Cathedral",
    "SM City Bataan",
    "Victory Liner Terminal Balanga",
    "Bataan People's Center"
  ],
  "Bataan - Abucay": [
    "Abucay Church",
    "Abucay Municipal Hall",
    "Abucay Public Market"
  ],
  "Bataan - Bagac": [
    "Bagac Municipal Hall",
    "Bagac Public Market",
    "Mount Samat National Shrine (nearby)"
  ],
  "Bataan - Dinalupihan": [
    "Dinalupihan Municipal Hall",
    "Dinalupihan Public Market",
    "Dinalupihan Church",
    "Victory Liner Terminal Dinalupihan"
  ],
  "Bataan - Hermosa": [
    "Hermosa Municipal Hall",
    "Hermosa Public Market",
    "Bataan Nuclear Power Plant (nearby)"
  ],
  "Bataan - Limay": [
    "Limay Municipal Hall",
    "Limay Public Market",
    "Limay Church"
  ],
  "Bataan - Mariveles": [
    "Mariveles Municipal Hall",
    "Mariveles Public Market",
    "Mariveles Port",
    "Freeport Area of Bataan"
  ],
  "Bataan - Morong": [
    "Morong Municipal Hall",
    "Morong Beach",
    "Subic Bay Freeport (nearby)"
  ],
  "Bataan - Orani": [
    "Orani Municipal Hall",
    "Orani Public Market",
    "Orani Church"
  ],
  "Bataan - Orion": [
    "Orion Municipal Hall",
    "Orion Public Market",
    "Bataan Technology Park"
  ],
  "Bataan - Pilar": [
    "Pilar Municipal Hall",
    "Pilar Public Market",
    "Pilar Church"
  ],
  "Bataan - Samal": [
    "Samal Municipal Hall",
    "Samal Public Market",
    "Samal Church"
  ]
};

// Coordinates for each city/municipality (center points)
const CITY_COORDINATES: { [key: string]: [number, number] } = {
  "Olongapo City": [14.8294, 120.2824],
  "Zambales - Botolan": [15.2867, 120.0167],
  "Zambales - Cabangan": [15.1500, 120.0833],
  "Zambales - Candelaria": [15.5167, 119.9167],
  "Zambales - Castillejos": [14.9667, 120.1833],
  "Zambales - Iba (Capital)": [15.3333, 119.9833],
  "Zambales - Masinloc": [15.5333, 119.9500],
  "Zambales - Palauig": [15.4333, 119.9167],
  "Zambales - San Antonio": [14.9500, 120.1000],
  "Zambales - San Felipe": [14.9833, 120.1500],
  "Zambales - San Marcelino": [14.8833, 120.1667],
  "Zambales - San Narciso": [15.0167, 120.0833],
  "Zambales - Santa Cruz": [15.7667, 120.1167],
  "Zambales - Subic": [14.8833, 120.2333],
  // Bataan Coordinates
  "Bataan - Balanga City (Capital)": [14.6764, 120.5364],
  "Bataan - Abucay": [14.7167, 120.5333],
  "Bataan - Bagac": [14.5833, 120.3833],
  "Bataan - Dinalupihan": [14.8833, 120.4667],
  "Bataan - Hermosa": [14.8333, 120.5000],
  "Bataan - Limay": [14.5667, 120.6000],
  "Bataan - Mariveles": [14.4333, 120.4833],
  "Bataan - Morong": [14.6833, 120.2667],
  "Bataan - Orani": [14.8000, 120.5333],
  "Bataan - Orion": [14.6167, 120.5833],
  "Bataan - Pilar": [14.6667, 120.5667],
  "Bataan - Samal": [14.7667, 120.5333]
};

// Landmark coordinates (approximate locations)
const LANDMARK_COORDINATES: { [key: string]: [number, number] } = {
  // Olongapo City
  "SM City Olongapo": [14.8294, 120.2867],
  "Harbor Point Mall": [14.8306, 120.2819],
  "Rizal Triangle": [14.8283, 120.2847],
  "Olongapo City Hall": [14.8306, 120.2825],
  "Gordon College": [14.8328, 120.2881],
  "James L. Gordon Memorial Hospital": [14.8322, 120.2842],
  "St. James Parish Church": [14.8297, 120.2831],
  "Subic Bay Freeport Zone Gate": [14.8194, 120.2722],
  "Olongapo Sports Complex": [14.8267, 120.2889],
  "East Avenue Medical Center": [14.8311, 120.2856],
  "Olongapo City Market": [14.8289, 120.2836],
  "Magsaysay Drive": [14.8278, 120.2842],
  "Victory Liner Bus Terminal": [14.8261, 120.2853],
  // Bataan - Balanga City
  "Balanga City Hall": [14.6764, 120.5364],
  "Capitol Compound": [14.6756, 120.5372],
  "Balanga Public Market": [14.6769, 120.5358],
  "Balanga Cathedral": [14.6761, 120.5367],
  "SM City Bataan": [14.6778, 120.5392],
  "Victory Liner Terminal Balanga": [14.6753, 120.5369],
  "Bataan People's Center": [14.6758, 120.5375],
};

const HARASSMENT_DEGREE_OPTIONS = [
  { value: HarassmentDegree.LIGHT, label: 'Light', description: 'Light gestures, jokes, or comments' },
  { value: HarassmentDegree.SEVERE, label: 'Severe', description: 'Unwelcome touching, advances' },
  { value: HarassmentDegree.GRAVE, label: 'Grave', description: 'Sexual assault, rape' },
] as const;

const FormalComplaint = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const evidenceRef = useRef<HTMLInputElement>(null);
  const lastValidationLog = useRef<{[key: number]: boolean}>({});

  // Helper function to generate formatted case ID from Firestore hash
  const formatCaseId = (firestoreId: string): string => {
    // Take first 8 characters of the hash and convert to uppercase
    const hashPart = firestoreId.substring(0, 8).toUpperCase();
    // Get numeric value from hash characters
    const numericValue = parseInt(hashPart, 36) % 100000; // Modulo to keep it reasonable
    const paddedNumber = String(numericValue).padStart(5, '0');
    return `CASE${paddedNumber}`;
  };

  // Get today's date in local timezone and format as YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateError, setDateError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadStage, setCurrentUploadStage] = useState('');
  const [otherTypeDetail, setOtherTypeDetail] = useState("");

  const [formData, setFormData] = useState<ComplaintFormData>({
    // Auto-filled from user profile
    complainantName: currentUser?.displayName || currentUser?.email || "",
    complainantAddress: "",
    complainantContact: "",
    complainantType: undefined,  // NEW: Person type
    
    // Respondent Information
    respondentName: "",
    respondentAddress: "",
    respondentDepartment: "",
    respondentType: undefined,  // NEW: Person type
    
    // Incident Details
    title: "",
    description: "",
    statementOfFacts: "",
    type: FORMAL_COMPLAINT_CATEGORIES[0].value as ComplaintType,
    harassmentDegree: undefined,  // NEW: Harassment degree
    incidentDate: "",
    incidentTime: "",
    incidentLocation: "",
    landmark: "",
    
    // Additional Information
    witnesses: "",
    additionalInfo: "",
    
    // Evidence
    evidence: []
  });

  // Location selection states
  const [locationVicinity, setLocationVicinity] = useState<string>("inside"); // "inside" or "outside"
  const [selectedCity, setSelectedCity] = useState<string>("Olongapo City");
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");
  const [availableBarangays, setAvailableBarangays] = useState<string[]>(LOCATIONS["Olongapo City"]);
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locations, setLocations] = useState<{ id: string; name: string; category: string }[]>([]);
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [unknownRespondent, setUnknownRespondent] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([]);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    complainantName?: string;
    complainantAddress?: string;
    complainantType?: string;
    complainantContact?: string;
  }>({});

  // Validation functions
  const validateFullName = (name: string): string | null => {
    if (!name || name.trim() === '') {
      return 'Full name is required';
    }
    
    const trimmed = name.trim();
    
    // Min/max length
    if (trimmed.length < 4) {
      return 'Full name must be at least 4 characters';
    }
    if (trimmed.length > 100) {
      return 'Full name must not exceed 100 characters';
    }
    
    // At least 2 words
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) {
      return 'Please enter both first and last name';
    }
    
    // Check for vowels (reject gibberish)
    const hasVowel = /[aeiouAEIOU]/.test(trimmed);
    if (!hasVowel) {
      return 'Please enter a valid name';
    }
    
    // Check for all-caps gibberish (all caps and no vowels is suspicious)
    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
    if (isAllCaps && !hasVowel) {
      return 'Please enter a valid name';
    }
    
    return null;
  };

  const validateAddress = (address: string): string | null => {
    if (!address || address.trim() === '') {
      return 'Address is required';
    }
    
    const trimmed = address.trim();
    
    // Minimum 10 characters
    if (trimmed.length < 10) {
      return 'Address must be at least 10 characters';
    }
    
    // Check for repeated characters (e.g., "aaaaa")
    if (/([a-zA-Z])\1{4,}/.test(trimmed)) {
      return 'Please enter a valid address';
    }
    
    // Check for all whitespace
    if (!/\S/.test(trimmed)) {
      return 'Please enter a valid address';
    }
    
    return null;
  };

  const validateContactNumber = (contact: string): string | null => {
    return validatePhMobile(contact, { required: true });
  };

  const validateComplainantType = (type: string): string | null => {
    if (!type || type.trim() === '') {
      return 'Please select your role';
    }
    return null;
  };

  const COMPLAINANT_FIELD_LABELS: Record<string, string> = {
    complainantName: 'Full name',
    complainantAddress: 'Address',
    complainantType: 'Role',
    complainantContact: 'Contact',
  };

  const shortMissingFieldsDescription = (fields: string[]): string => {
    if (fields.length === 0) return 'Fill in all required fields.';
    if (fields.length === 1) return `Missing: ${fields[0]}.`;
    if (fields.length <= 3) return `Missing: ${fields.join(', ')}.`;
    return `${fields.length} required fields missing.`;
  };

  const shortComplainantDescription = (errors: typeof fieldErrors): string => {
    const missing = Object.keys(errors).map((key) => COMPLAINANT_FIELD_LABELS[key] ?? key);
    return shortMissingFieldsDescription(missing);
  };

  /** Returns validation result without mutating state (safe for toasts). */
  const getComplainantValidation = () => {
    if (isAnonymous) {
      return { valid: true, errors: {} as typeof fieldErrors, messages: [] as string[] };
    }

    const errors: typeof fieldErrors = {};
    const messages: string[] = [];

    const nameError = validateFullName(formData.complainantName);
    if (nameError) {
      errors.complainantName = nameError;
      messages.push(`${COMPLAINANT_FIELD_LABELS.complainantName}: ${nameError}`);
    }

    const addressError = validateAddress(formData.complainantAddress);
    if (addressError) {
      errors.complainantAddress = addressError;
      messages.push(`${COMPLAINANT_FIELD_LABELS.complainantAddress}: ${addressError}`);
    }

    const contactError = validateContactNumber(formData.complainantContact);
    if (contactError) {
      errors.complainantContact = contactError;
      messages.push(`${COMPLAINANT_FIELD_LABELS.complainantContact}: ${contactError}`);
    }

    const typeError = validateComplainantType(formData.complainantType);
    if (typeError) {
      errors.complainantType = typeError;
      messages.push(`${COMPLAINANT_FIELD_LABELS.complainantType}: ${typeError}`);
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      messages,
    };
  };

  // Validate all complainant fields
  const validateComplainantInfo = (): boolean => {
    const result = getComplainantValidation();
    setFieldErrors(result.errors);
    return result.valid;
  };

  // Handle field blur for validation
  const handleFieldBlur = (field: string) => {
    if (isAnonymous && field.startsWith('complainant')) {
      return;
    }
    
    const errors: typeof fieldErrors = { ...fieldErrors };
    
    switch (field) {
      case 'complainantName':
        errors.complainantName = validateFullName(formData.complainantName) || undefined;
        break;
      case 'complainantAddress':
        errors.complainantAddress = validateAddress(formData.complainantAddress) || undefined;
        break;
      case 'complainantType':
        errors.complainantType = validateComplainantType(formData.complainantType) || undefined;
        break;
      case 'complainantContact':
        errors.complainantContact = validateContactNumber(formData.complainantContact) || undefined;
        break;
    }
    
    setFieldErrors(errors);
  };

  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    if (isAnonymous) {
      // When anonymous, no complainant fields are required
      return true;
    }
    
    // When not anonymous, all fields are required
    const nameValid = !validateFullName(formData.complainantName);
    const addressValid = !validateAddress(formData.complainantAddress);
    const typeValid = !validateComplainantType(formData.complainantType);
    const contactValid = !validateContactNumber(formData.complainantContact);
    
    return nameValid && addressValid && typeValid && contactValid;
  };

  // Fetch locations from Firestore
  useEffect(() => {
    const locationsQuery = query(collection(db, 'locations'), orderBy('name'));
    const unsubscribe = onSnapshot(
      locationsQuery,
      (snapshot) => {
        const locationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          category: doc.data().category
        }));
        setLocations(locationsData);
      },
      (error) => {
        console.error('Error fetching locations:', error);
        // Keep empty list — user can still use custom location input
        setLocations([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const departments = [
    'Administration',
    'CCS - College of Computer Studies',
    'CHTM - College of Hospitality and Tourism Management', 
    'CEAS - College of Education and Arts Sciences',
    'CBA - College of Business Administration',
    'CAHS - College of Allied Health Sciences'
  ];

  const positions = [
    'Student',
    'Faculty',
    'Staff',
    'Administrator',
    'Part-time Faculty',
    'Graduate Student',
    'Researcher'
  ];

  const handleInputChange = (field: string, value: any) => {
    // Clear field error when user starts typing
    if (fieldErrors[field as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Handle date validation for incidentDate
    if (field === "incidentDate") {
      if (value) {
        const todayString = getTodayString();
        
        // Compare date strings directly to avoid timezone issues
        if (value > todayString) {
          setDateError(`Hindi pwedeng future date ang incident date. Ngayon lang ang pinakahuli: ${todayString}`);
          return; // Don't update the state if future date
        } else {
          setDateError(""); // Clear error if valid date
        }
      } else {
        setDateError(""); // Clear error if no date selected
      }
    }

    // Validate contact number — PH mobile must start with 09 (unless anonymous)
    if (field === "complainantContact" && !isAnonymous) {
      setFormData(prev => ({ ...prev, [field]: sanitizePhMobileInput(value) }));
      return;
    }

    // Validate name fields to only allow letters, spaces, hyphens, apostrophes, and periods
    if (field === "complainantName" || field === "respondentName") {
      // Allow letters (including Unicode), spaces, hyphens, apostrophes, and periods
      const nameOnly = value.replace(/[^a-zA-Z\u00C0-\u00FF\s\-'.]/g, '');
      setFormData(prev => ({ ...prev, [field]: nameOnly }));
      return;
    }

    // Validate description to prevent special characters (allow letters, numbers, basic punctuation)
    if (field === "description") {
      // Allow letters, numbers, spaces, and basic punctuation (.,!?;:()-)
      const cleanDescription = value.replace(/[^a-zA-Z0-9\s.,!?;:()\-\u00C0-\u00FF]/g, '');
      setFormData(prev => ({ ...prev, [field]: cleanDescription }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle city selection
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedBarangay("");
    setAvailableBarangays(LOCATIONS[city as keyof typeof LOCATIONS] || []);
    // Reset location field
    setFormData(prev => ({ ...prev, incidentLocation: "", landmark: "" }));
  };

  // Handle barangay selection
  const handleBarangayChange = (barangay: string) => {
    setSelectedBarangay(barangay);
    // Set the full location as "Barangay, City"
    const fullLocation = `${barangay}, ${selectedCity}`;
    setFormData(prev => ({ ...prev, incidentLocation: fullLocation }));
    
    // Only auto-pin if there's no existing pin (preserve user's existing pin)
    if (!mapCoordinates && selectedCity && CITY_COORDINATES[selectedCity]) {
      const [lat, lng] = CITY_COORDINATES[selectedCity];
      setMapCoordinates({
        lat,
        lng,
        address: fullLocation
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mpeg', 'video/quicktime'];
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      // Check file type
      const isImage = allowedImageTypes.includes(file.type);
      const isVideo = allowedVideoTypes.includes(file.type);
      const isDocument = allowedDocTypes.includes(file.type);

      if (!isImage && !isVideo && !isDocument) {
        invalidFiles.push(`${file.name} (only images, videos, and documents allowed)`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name} (exceeds 50MB limit)`);
        return;
      }

      validFiles.push(file);
    });

    // Show error if there are invalid files
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: `${invalidFiles.length} file(s) not allowed.`,
        variant: "destructive"
      });
    }

    // Add valid files to form data
    if (validFiles.length > 0) {
      setFormData(prev => ({ 
        ...prev, 
        evidence: [...prev.evidence, ...validFiles] 
      }));

      if (validFiles.length > 0) {
        toast({
          title: "Files added",
          description: `${validFiles.length} file(s) added.`,
        });
      }
    }
  };

  const removeEvidence = (index: number) => {
    setFormData(prev => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index)
    }));
  };

  // Generate title based on complaint type
  const generateTitle = () => {
    const complaintTypeLabel = FORMAL_COMPLAINT_CATEGORIES.find(t => t.value === formData.type)?.label || "Complaint";
    const date = formData.incidentDate ? new Date(formData.incidentDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "";
    
    let generatedTitle = "";
    
    if (formData.type === "other" && otherTypeDetail.trim()) {
      generatedTitle = `${otherTypeDetail} - ${date || "Incident Report"}`;
    } else {
      generatedTitle = `${complaintTypeLabel} - ${date || "Incident Report"}`;
    }
    
    handleInputChange("title", generatedTitle);
    setTitleGenerated(true);
    
    toast({
      title: "Title generated",
      description: "You can edit it if needed.",
    });
  };

  // Evidence Modal Handler
  const handleEvidenceSubmit = (evidence: EvidenceData) => {
    // Add files to formData
    if (evidence.files.length > 0) {
      setFormData(prev => ({
        ...prev,
        evidence: [...prev.evidence, ...evidence.files]
      }));
    }
    
    // Store external links
    if (evidence.externalLinks.length > 0) {
      setEvidenceLinks(prev => [...prev, ...evidence.externalLinks]);
    }

    toast({
      title: "Evidence added",
      description: `${evidence.files.length} file(s), ${evidence.externalLinks.length} link(s).`,
    });
  };

  // Helper to check if a field has an error (for visual feedback)
  const hasFieldError = (fieldName: string): boolean => {
    if (!validationAttempted) return false;

    switch (currentStep) {
      case 1:
        if (isAnonymous) return false;
        if (fieldName === 'complainantName') return !formData.complainantName || !!fieldErrors.complainantName;
        if (fieldName === 'complainantAddress') return !formData.complainantAddress || !!fieldErrors.complainantAddress;
        if (fieldName === 'complainantContact') return !formData.complainantContact || !!fieldErrors.complainantContact;
        if (fieldName === 'complainantType') return !formData.complainantType || !!fieldErrors.complainantType;
        break;
      case 2:
        if (fieldName === 'respondentName') return !formData.respondentName;
        if (fieldName === 'respondentAddress' && unknownRespondent) {
          return !formData.respondentAddress || formData.respondentAddress.trim().length < 20;
        }
        break;
      case 3:
        if (fieldName === 'title') return !formData.title;
        if (fieldName === 'description') return !formData.description || formData.description.trim().length < 20;
        if (fieldName === 'incidentDate') return !formData.incidentDate;
        if (fieldName === 'incidentLocation') return !formData.incidentLocation;
        if (fieldName === 'otherType') return formData.type === 'other' && otherTypeDetail.trim().length === 0;
        break;
      case 4:
        if (fieldName === 'evidence') return formData.evidence.length === 0 && evidenceLinks.length === 0;
        break;
    }
    return false;
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (isAnonymous) {
          if (lastValidationLog.current[1] !== true) {
            console.log('✓ Step 1 validation: PASS (Anonymous mode)');
            lastValidationLog.current[1] = true;
          }
          return true;
        }
        return getComplainantValidation().valid;
      case 2:
        const step2Valid = unknownRespondent 
          ? !!(formData.respondentName && formData.respondentAddress && formData.respondentAddress.trim().length >= 20)
          : !!formData.respondentName;
        if (lastValidationLog.current[2] !== step2Valid) {
          console.log('🔍 Step 2 validation:', {
            step2Valid,
            respondentName: formData.respondentName,
            unknownRespondent,
            respondentDescriptionLength: formData.respondentAddress?.trim().length || 0
          });
          lastValidationLog.current[2] = step2Valid;
        }
        return step2Valid;
      case 3:
        const step3Valid = !!(formData.title && formData.description && formData.description.trim().length >= 20 && formData.incidentDate && formData.incidentLocation && (formData.type !== "other" || otherTypeDetail.trim().length > 0));
        if (lastValidationLog.current[3] !== step3Valid) {
          console.log('🔍 Step 3 validation:', {
            step3Valid,
            title: formData.title,
            description: formData.description,
            incidentDate: formData.incidentDate,
            incidentLocation: formData.incidentLocation
          });
          lastValidationLog.current[3] = step3Valid;
        }
        return step3Valid;
      case 4:
        // Evidence is now optional - always return true
        const step4Valid = true;
        if (lastValidationLog.current[4] !== step4Valid) {
          console.log('🔍 Step 4 validation:', {
            step4Valid,
            evidenceCount: formData.evidence.length
          });
          lastValidationLog.current[4] = step4Valid;
        }
        return step4Valid;
      default:
        return true;
    }
  };

  const nextStep = () => {
    setValidationAttempted(true);
    
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
      setValidationAttempted(false); // Reset for next step
    } else {
      // Provide specific error messages for each step
      let errorTitle = "Incomplete Information";
      let errorDescription = "";

      switch (currentStep) {
        case 1: {
          errorTitle = "Incomplete info";
          const complainantResult = getComplainantValidation();
          setFieldErrors(complainantResult.errors);
          errorDescription = complainantResult.messages.length > 0
            ? shortComplainantDescription(complainantResult.errors)
            : isAnonymous
              ? "Check the anonymous option."
              : "Fill in all required fields.";
          break;
        }
        case 2:
          errorTitle = "Respondent required";
          errorDescription = unknownRespondent
            ? "Add at least 20 characters of description."
            : "Enter the respondent's name.";
          break;
        case 3: {
          errorTitle = "Incident details missing";
          const missingFields = [];
          if (!formData.title) missingFields.push("Title");
          if (!formData.description || formData.description.trim().length < 20) {
            missingFields.push("Description");
          }
          if (!formData.incidentDate) missingFields.push("Date");
          if (!formData.incidentLocation) missingFields.push("Location");
          if (formData.type === "other" && otherTypeDetail.trim().length === 0) {
            missingFields.push("Complaint type");
          }

          errorDescription = shortMissingFieldsDescription(missingFields);
          break;
        }
        case 4:
          errorTitle = "Evidence optional";
          errorDescription = "You can add evidence later.";
          break;
        default:
          errorDescription = "Fill in all required fields.";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // ✅ IMPROVED CLOUDINARY UPLOAD FUNCTION WITH BETTER ERROR HANDLING
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      console.log(`📤 Uploading ${file.name} to Cloudinary...`);
      console.log(`🔧 Using preset: ${CLOUDINARY_UPLOAD_PRESET}`);
      console.log(`☁️ Cloud name: ${CLOUDINARY_CLOUD_NAME}`);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Cloudinary response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        // Specific error messages based on status code
        if (response.status === 400) {
          throw new Error(`Invalid upload preset or configuration. Please check Cloudinary settings.`);
        } else if (response.status === 401) {
          throw new Error(`Upload unauthorized. Check upload preset permissions.`);
        } else {
          throw new Error(`Upload failed: ${response.status} - ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ File uploaded successfully:', data.secure_url);
      return data.secure_url;
      
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        throw new Error(`Failed to upload ${file.name}. Please try again.`);
      }
    }
  };

  // ✅ OPTIMIZED CLOUDINARY FILE UPLOAD
  const uploadFilesToCloudinary = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
      try {
        console.log(`📤 Uploading ${file.name} (${index + 1}/${files.length})...`);
        
        // Update progress for each file
        const baseProgress = 40;
        const fileProgress = (index / files.length) * 40;
        setUploadProgress(baseProgress + fileProgress);
        
        const downloadURL = await uploadToCloudinary(file);
        return downloadURL;
        
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        throw error;
      }
    });
    
    return Promise.all(uploadPromises);
  };

  // ✅ OPTIMIZED SUBMISSION FUNCTION WITH CLOUDINARY
  const handleSubmit = async () => {
    // Validate complainant information first
    const complainantResult = getComplainantValidation();
    if (!complainantResult.valid) {
      setFieldErrors(complainantResult.errors);
      setValidationAttempted(true);
      setCurrentStep(1);
      toast({
        title: "Incomplete info",
        description: shortComplainantDescription(complainantResult.errors),
        variant: "destructive"
      });
      return;
    }

    // Backend validation for contact number
    if (!isAnonymous && formData.complainantContact) {
      const contactError = validateContactNumber(formData.complainantContact);
      if (contactError) {
        toast({
          title: "Invalid Contact Number",
          description: contactError,
          variant: "destructive"
        });
        return;
      }
    }

    // Backend validation for full name
    if (!isAnonymous && formData.complainantName) {
      const nameError = validateFullName(formData.complainantName);
      if (nameError) {
        toast({
          title: "Invalid Name",
          description: nameError,
          variant: "destructive"
        });
        return;
      }
    }

    // Backend validation for address
    if (!isAnonymous && formData.complainantAddress) {
      const addressError = validateAddress(formData.complainantAddress);
      if (addressError) {
        toast({
          title: "Invalid Address",
          description: addressError,
          variant: "destructive"
        });
        return;
      }
    }

    // Check for date validation error
    if (dateError) {
      toast({
        title: "Invalid date",
        description: "Ayusin muna ang incident date.",
        variant: "destructive"
      });
      return;
    }

    // Additional check: validate incident date one more time before submission
    if (formData.incidentDate && formData.incidentDate > getTodayString()) {
      toast({
        title: "Invalid date", 
        description: "Hindi pwedeng future date.",
        variant: "destructive"
      });
      return;
    }

    // Validate incident details (Step 3)
    const missingFields = [];
    if (!formData.title) missingFields.push("Title");
    if (!formData.description || formData.description.trim().length < 20) missingFields.push("Description");
    if (!formData.incidentDate) missingFields.push("Date");
    if (!formData.incidentLocation) missingFields.push("Location");
    if (formData.type === "other" && otherTypeDetail.trim().length === 0) missingFields.push("Complaint type");
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing fields",
        description: shortMissingFieldsDescription(missingFields),
        variant: "destructive"
      });
      return;
    }

    if (!validateStep(4)) {
      toast({
        title: "Evidence required",
        description: "Upload at least 1 file or link.",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Login required",
        description: "Log in to submit.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setCurrentUploadStage('Starting submission...');
    
    try {
      console.log('🚀 Starting complaint submission with Cloudinary...');
      setUploadProgress(10);
      setCurrentUploadStage('Creating complaint document...');
      
      // Create complaint data first (without file URLs)
      const complaintData = {
        // User information
        userId: currentUser.uid,
        userEmail: isAnonymous ? 'anonymous@speakupgc.com' : currentUser.email,
        complainantId: currentUser.uid,
        complainantName: formData.complainantName,
        complainantAddress: formData.complainantAddress,
        complainantContact: formData.complainantContact,
        
        // Anonymous flag
        isAnonymous: isAnonymous,
        anonymityLevel: isAnonymous ? 'full' : 'confidential',
        
        // Respondent information
        respondentId: '', // Will be filled later if respondent is a user
        respondentName: formData.respondentName,
        respondentAddress: formData.respondentAddress,
        respondentDepartment: formData.respondentDepartment,
        ...(formData.respondentType && { respondentType: formData.respondentType }),  // NEW: Respondent type (only if set)
        
        // Complainant type
        ...(formData.complainantType && { complainantType: formData.complainantType }),  // NEW: Complainant type (only if set)
        
        // Incident details
        title: formData.title,
        description: formData.description,
        ...(formData.statementOfFacts.trim() && { statementOfFacts: formData.statementOfFacts.trim() }),
        type: formData.type,
        ...(formData.harassmentDegree && { harassmentDegree: formData.harassmentDegree }),  // NEW: Harassment degree (only if set)
        category: formData.type, // Alias for compatibility
        incidentDate: formData.incidentDate,
        incidentTime: formData.incidentTime,
        incidentLocation: formData.incidentLocation,
        location: formData.incidentLocation, // Alias for compatibility
        
        // Location vicinity
        locationVicinity: locationVicinity, // "inside" or "outside"
        
        // Location coordinates (if pinned on map)
        ...(mapCoordinates && {
          latitude: mapCoordinates.lat,
          longitude: mapCoordinates.lng,
          mapAddress: mapCoordinates.address
        }),
        
        // Additional information
        witnesses: formData.witnesses,
        additionalInfo: formData.additionalInfo,
        
        // Status and metadata
        status: 'pending',
        stage: 'filing',
        isDeleted: false,
        confidentialityLevel: 'confidential',
        
        // Timestamps
        filingDate: Timestamp.now(),
        reportedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        
        // Evidence tracking (will be updated after upload)
        evidenceCount: formData.evidence.length,
        evidenceURLs: [],
        evidenceFileNames: formData.evidence.map(f => f.name),
        evidenceExternalLinks: evidenceLinks, // Store external links
        
        // Add upload status
        uploadStatus: 'uploading_files',
        
        // Cloudinary info
        storageProvider: 'cloudinary',
        cloudName: CLOUDINARY_CLOUD_NAME
      };

      // Step 1: Create complaint document immediately
      console.log('📝 Creating complaint document...');
      const complaintRef = await addDoc(collection(db, 'complaints'), complaintData);
      const complaintId = complaintRef.id;
      const formattedCaseId = formatCaseId(complaintId);
      console.log('✅ Complaint document created:', complaintId, '| Formatted:', formattedCaseId);
      setUploadProgress(30);

      // Show immediate feedback to user
      toast({
        title: "Complaint registered",
        description: `Case ID: ${formattedCaseId}. Uploading files...`,
        duration: 3000,
      });

      // Step 2: Upload files to Cloudinary
      let evidenceURLs: string[] = [];

      try {
        console.log('☁️ Starting Cloudinary file uploads...');
        setCurrentUploadStage('Uploading evidence files...');
        setUploadProgress(40);

        // Upload evidence files to Cloudinary
        if (formData.evidence.length > 0) {
          evidenceURLs = await uploadFilesToCloudinary(formData.evidence);
          setUploadProgress(80);
          console.log('✅ All evidence files uploaded to Cloudinary');
        }

      } catch (uploadError) {
        console.error('⚠️ Some Cloudinary uploads failed, but continuing:', uploadError);
        // Continue with complaint submission even if file uploads fail
        toast({
          title: "Upload warning",
          description: "Some files failed; complaint saved.",
          variant: "default"
        });
      }

      // Step 3: Update complaint with Cloudinary URLs
      console.log('🔄 Updating complaint with Cloudinary URLs...');
      setCurrentUploadStage('Finalizing submission...');
      
      await updateDoc(doc(db, 'complaints', complaintId), {
        caseId: formattedCaseId,
        evidenceURLs: evidenceURLs,
        evidenceCount: evidenceURLs.length,
        uploadStatus: 'completed',
        updatedAt: Timestamp.now(),
      });

      // Step 4: Create report entry
      console.log('📋 Creating report entry...');
      try {
        const reportData = {
          ...complaintData,
          evidenceURLs: evidenceURLs,
          evidenceCount: evidenceURLs.length,
          uploadStatus: 'completed',
          complaintId: complaintId,
        };

        await addDoc(collection(db, 'reports'), reportData);
        console.log('✅ Report entry created');
      } catch (reportError) {
        console.warn('⚠️ Could not create report entry, but complaint was saved:', reportError);
      }

      // Success!
      console.log('🎉 Complaint submission completed successfully!');
      setUploadProgress(100);
      setCurrentUploadStage('Complete!');

      // Send in-app notification to complainant
      try {
        await NotificationService.sendComplaintCreatedNotification(
          currentUser.uid,
          complaintId,
          formData.title || 'Formal Complaint'
        );
      } catch (notifyError) {
        console.warn('⚠️ Could not send complaint created notification:', notifyError);
      }

      // Send notification to respondent if they're a registered user
      if (!unknownRespondent && formData.respondentName) {
        try {
          // Try to find respondent by email or name in users collection
          const usersRef = collection(db, 'users');
          const emailQuery = query(usersRef, where('email', '==', formData.respondentAddress));
          const emailSnapshot = await getDocs(emailQuery);
          
          if (!emailSnapshot.empty) {
            const respondentUser = emailSnapshot.docs[0];
            await NotificationService.sendRespondentComplaintNotification(
              respondentUser.id,
              complaintId,
              formData.title || 'Formal Complaint'
            );
            console.log('✅ Notification sent to respondent (found by email)');
          } else {
            // Try to find by display name
            const nameQuery = query(usersRef, where('displayName', '==', formData.respondentName));
            const nameSnapshot = await getDocs(nameQuery);
            
            if (!nameSnapshot.empty) {
              const respondentUser = nameSnapshot.docs[0];
              await NotificationService.sendRespondentComplaintNotification(
                respondentUser.id,
                complaintId,
                formData.title || 'Formal Complaint'
              );
              console.log('✅ Notification sent to respondent (found by name)');
            } else {
              console.log('ℹ️ Respondent not found as registered user - no notification sent');
            }
          }
        } catch (respondentNotifyError) {
          console.warn('⚠️ Could not notify respondent:', respondentNotifyError);
        }
      }

      // Send notifications to ALL admins about new complaint
      try {
        const admins = await RepresentativeService.getAllAdmins();
        console.log(`📧 Notifying ${admins.length} admin(s) about new complaint`);
        
        for (const admin of admins) {
          try {
            await NotificationService.createNotification(
              admin.userId,
              'complaint_created',
              'New Complaint Submitted',
              `A new ${formData.type || 'formal'} complaint has been submitted. Case ID: ${formattedCaseId}`,
              {
                priority: 'high',
                complaintId: complaintId,
                actionUrl: `/admin/reports?reportId=${complaintId}&tab=details`,
                actionLabel: 'View Complaint',
                data: {
                  category: formData.type,
                  severity: 'high',
                  isAnonymous: isAnonymous
                }
              }
            );
          } catch (adminNotifyError) {
            console.warn(`⚠️ Could not notify admin ${admin.email}:`, adminNotifyError);
          }
        }
        console.log('✅ Admin notifications sent');
      } catch (adminError) {
        console.warn('⚠️ Could not send admin notifications:', adminError);
      }
      
      toast({
        title: "Submitted!",
        description: `Case ID: ${formattedCaseId}`,
        duration: 5000,
      });
      
      // Navigate to complaints list after submission
      setTimeout(() => {
        navigate("/complaints");
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error submitting complaint:', error);
      setCurrentUploadStage('Error occurred');
      
      let errorMessage = "There was an error submitting your complaint. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = "Permission denied. Please check your account permissions.";
        } else if (error.message.includes('network') || error.message.includes('offline')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes('Cloudinary')) {
          errorMessage = "File upload failed. Please try uploading smaller files or check your connection.";
        } else if (error.message.includes('upload preset')) {
          errorMessage = "Cloudinary configuration error. Please contact administrator.";
        }
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setCurrentUploadStage('');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {/* Anonymous toggle */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => {
                  const isChecked = checked as boolean;
                  setIsAnonymous(isChecked);
                  if (isChecked) {
                    setFormData(prev => ({
                      ...prev,
                      complainantName: "Anonymous",
                      complainantAddress: "Not Disclosed",
                      complainantContact: "Not Disclosed"
                    }));
                    // Clear validation errors for anonymous fields
                    setFieldErrors(prev => ({
                      ...prev,
                      complainantName: undefined,
                      complainantAddress: undefined,
                      complainantContact: undefined,
                      complainantType: undefined,
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      complainantName: currentUser?.displayName || "",
                      complainantAddress: "",
                      complainantContact: ""
                    }));
                  }
                }}
                className="mt-0.5"
              />
              <div>
                <label htmlFor="anonymous" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Submit anonymously
                </label>
                <p className="text-xs text-blue-700 mt-0.5">
                  Your identity will not be disclosed to the respondent. Investigators will reference your case ID only.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Full name *
                {hasFieldError('complainantName') && <span className="text-red-500 ml-2 text-xs">(Required)</span>}
              </label>
              <Input
                value={formData.complainantName}
                onChange={(e) => handleInputChange("complainantName", e.target.value)}
                onBlur={() => handleFieldBlur('complainantName')}
                placeholder="Enter your full legal name"
                disabled={isAnonymous}
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                  isAnonymous ? "bg-gray-100 text-gray-400 border-gray-300" : 
                  fieldErrors.complainantName ? "bg-white text-gray-900 border-red-400 ring-2 ring-red-100" :
                  "bg-white text-gray-900 border-gray-300"
                }`}
              />
              {fieldErrors.complainantName && !isAnonymous && (
                <p className="text-xs text-red-500 mt-1.5">{fieldErrors.complainantName}</p>
              )}
              {formData.complainantName && !isAnonymous && !fieldErrors.complainantName && (
                <FormTip
                  variant="inline"
                  message={getFormSuggestions("complainantName", formData.complainantName, 1, formData)?.message || ""}
                  type={getFormSuggestions("complainantName", formData.complainantName, 1, formData)?.type || "info"}
                  show={!!getFormSuggestions("complainantName", formData.complainantName, 1, formData)}
                />
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Complete address *
                {hasFieldError('complainantAddress') && <span className="text-red-500 ml-2 text-xs">(Required)</span>}
              </label>
              <Textarea
                value={formData.complainantAddress}
                onChange={(e) => handleInputChange("complainantAddress", e.target.value)}
                onBlur={() => handleFieldBlur('complainantAddress')}
                placeholder="Street, barangay, city"
                disabled={isAnonymous}
                className={`w-full text-sm px-3 py-2 border rounded-lg resize-y min-h-[72px] leading-relaxed focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                  isAnonymous ? "bg-gray-100 text-gray-400 border-gray-300" :
                  fieldErrors.complainantAddress ? "bg-white text-gray-900 border-red-400 ring-2 ring-red-100" :
                  "bg-white text-gray-900 border-gray-300"
                }`}
              />
              {fieldErrors.complainantAddress && !isAnonymous && (
                <p className="text-xs text-red-500 mt-1.5">{fieldErrors.complainantAddress}</p>
              )}
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">{formData.complainantAddress.length} chars</span>
              </div>
            </div>

            {!isAnonymous && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                I am a *
                {hasFieldError('complainantType') && <span className="text-red-500 ml-2 text-xs">(Required)</span>}
              </label>
              <Select
                value={formData.complainantType ?? ""}
                onValueChange={(value) => {
                  handleInputChange("complainantType", value as PersonType);
                  handleFieldBlur('complainantType');
                }}
              >
                <SelectTrigger className={`w-full text-sm ${
                  fieldErrors.complainantType ? "bg-white text-gray-900 border-red-400 ring-2 ring-red-100" :
                  "bg-white text-gray-900 border-gray-300"
                }`}>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.complainantType && (
                <p className="text-xs text-red-500 mt-1.5">{fieldErrors.complainantType}</p>
              )}
            </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Contact number *
                {hasFieldError('complainantContact') && <span className="text-red-500 ml-2 text-xs">(Required)</span>}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  value={formData.complainantContact}
                  onChange={(e) => handleInputChange("complainantContact", e.target.value)}
                  onBlur={() => handleFieldBlur('complainantContact')}
                  placeholder="09XXXXXXXXX"
                  disabled={isAnonymous}
                  maxLength={11}
                  inputMode="numeric"
                  className={`w-full text-sm pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-colors ${
                    isAnonymous ? "bg-gray-100 text-gray-400 border-gray-300" :
                    fieldErrors.complainantContact ? "bg-white text-gray-900 border-red-400 ring-2 ring-red-100" :
                    isValidPhMobile(formData.complainantContact) ? "border-[#1D9E75]/40 bg-[#1D9E75]/5" :
                    "bg-white text-gray-900 border-gray-300"
                  }`}
                />
                {isValidPhMobile(formData.complainantContact) && !isAnonymous && !fieldErrors.complainantContact && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {fieldErrors.complainantContact && !isAnonymous && (
                <p className="text-xs text-red-500 mt-1.5">{fieldErrors.complainantContact}</p>
              )}
              {!isAnonymous && !fieldErrors.complainantContact && formData.complainantContact && formData.complainantContact.length >= 2 && !formData.complainantContact.startsWith("09") && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Must start with <strong>09</strong> (Philippine mobile).
                </p>
              )}
              {!isAnonymous && !fieldErrors.complainantContact && formData.complainantContact.startsWith("09") && formData.complainantContact.length < 11 && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {11 - formData.complainantContact.length} more digit(s) needed (09XXXXXXXXX).
                </p>
              )}
              {!isAnonymous && !fieldErrors.complainantContact && isValidPhMobile(formData.complainantContact) && (
                <p className="text-xs text-[#1D9E75] mt-1.5">
                  ✓ Valid PH mobile number
                </p>
              )}
              {!isAnonymous && !fieldErrors.complainantContact && !formData.complainantContact && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Must start with 09 · 11 digits total (e.g. 09171234567)
                </p>
              )}
              {(() => {
                const contactSuggestion = getFormSuggestions("complainantContact", formData.complainantContact, 1, formData);
                return contactSuggestion && contactSuggestion.type !== 'success' ? (
                  <FormTip
                    variant="inline"
                    message={contactSuggestion.message}
                    type={contactSuggestion.type}
                    show={true}
                  />
                ) : null;
              })()}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {/* Unknown respondent toggle */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox
                id="unknownRespondent"
                checked={unknownRespondent}
                onCheckedChange={(checked) => {
                  setUnknownRespondent(checked as boolean);
                  if (checked) {
                    handleInputChange("respondentName", "Unknown/Not Disclosed");
                    handleInputChange("respondentDepartment", "Unknown");
                  } else {
                    handleInputChange("respondentName", "");
                    handleInputChange("respondentDepartment", "");
                  }
                }}
                className="mt-0.5"
              />
              <label htmlFor="unknownRespondent" className="text-sm font-medium text-gray-900 cursor-pointer">
                I don't know the respondent's identity
              </label>
            </div>

            {!unknownRespondent && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Full name of respondent *</label>
                  <Input
                    value={formData.respondentName}
                    onChange={(e) => handleInputChange("respondentName", e.target.value)}
                    placeholder="Enter respondent's full name"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Department <span className="font-normal text-gray-400">(optional)</span></label>
                  <Select
                    value={formData.respondentDepartment ?? ""}
                    onValueChange={(value) => handleInputChange("respondentDepartment", value)}
                  >
                    <SelectTrigger className="w-full text-sm border-gray-300 h-10">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-specified">Not specified</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Respondent is a *</label>
                  <Select
                    value={formData.respondentType ?? ""}
                    onValueChange={(value) => handleInputChange("respondentType", value as PersonType)}
                  >
                    <SelectTrigger className="w-full text-sm border-gray-300 h-10">
                      <SelectValue placeholder="Select respondent type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Physical description or identifying details
                  {unknownRespondent && <span className="text-red-500 ml-1">*</span>}
                </label>
                {unknownRespondent && (
                  <span className={`text-xs font-medium ${
                    formData.respondentAddress.trim().length === 0 ? "text-gray-400" :
                    formData.respondentAddress.trim().length < 20 ? "text-red-500" :
                    "text-[#1D9E75]"
                  }`}>
                    {formData.respondentAddress.trim().length >= 20 
                      ? `${formData.respondentAddress.trim().length} chars ✓` 
                      : `${formData.respondentAddress.trim().length} / 20 minimum`}
                  </span>
                )}
              </div>
              <Textarea
                placeholder={
                  unknownRespondent
                    ? "Describe the person — approximate age, height, clothing, where they are usually seen, etc."
                    : "Optional — any additional identifying details"
                }
                rows={3}
                value={formData.respondentAddress}
                onChange={(e) => handleInputChange("respondentAddress", e.target.value)}
                className={`w-full text-sm px-3 py-2 border rounded-lg bg-white text-gray-900 resize-y min-h-[72px] leading-relaxed focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                  unknownRespondent && formData.respondentAddress.trim().length > 0 && formData.respondentAddress.trim().length < 20
                    ? "border-red-400"
                    : "border-gray-300"
                }`}
              />
              {unknownRespondent && (
                <p className={`text-xs mt-1 ${
                  formData.respondentAddress.trim().length > 0 && formData.respondentAddress.trim().length < 20
                    ? "text-red-500"
                    : "text-gray-400"
                }`}>
                  {formData.respondentAddress.trim().length < 20
                    ? "Please provide at least 20 characters of description to help identify the respondent."
                    : "Since the identity is unknown, please describe any details that may help identify the respondent."}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {/* Description — moved first so Generate button can activate */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Description *</label>
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => {
                  handleInputChange("description", e.target.value);
                  if (titleGenerated) setTitleGenerated(false);
                }}
                placeholder="Describe what happened..."
                rows={5}
                className={`w-full text-sm px-3 py-2.5 border rounded-lg bg-white text-gray-900 resize-y min-h-[120px] leading-relaxed focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                  formData.description.trim().length > 0 && formData.description.trim().length < 20
                    ? "border-red-400"
                    : formData.description.trim().length >= 20
                    ? "border-[#1D9E75]"
                    : "border-gray-300"
                }`}
              />
              <div className="flex items-center justify-between mt-1.5">
                <div>
                  {formData.description.trim().length > 0 && formData.description.trim().length < 20 && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {20 - formData.description.trim().length} more characters needed
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  formData.description.trim().length === 0 ? "text-gray-400" :
                  formData.description.trim().length < 20 ? "text-red-500" :
                  "text-[#1D9E75]"
                }`}>
                  {formData.description.trim().length >= 20 
                    ? `${formData.description.trim().length} chars ✓` 
                    : `${formData.description.trim().length} / 20 minimum`}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Include who was involved, what happened, and any relevant context.</p>
            </div>

            {/* Title with Generate button */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Complaint title *
                <span className="ml-2 font-normal text-gray-400">Auto-generated from Type of complaint</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={formData.title}
                  onChange={(e) => { handleInputChange("title", e.target.value); setTitleGenerated(false); }}
                  placeholder="Write or auto-generate a title based on complaint type"
                  className={`flex-1 text-sm px-3 py-2 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${titleGenerated ? "border-[#1D9E75] bg-green-50" : "border-gray-300"}`}
                />
                <button
                  type="button"
                  onClick={generateTitle}
                  disabled={!formData.type || isGeneratingTitle}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#1D9E75] hover:bg-[#178F65] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors duration-150 flex-shrink-0"
                >
                  {isGeneratingTitle ? (
                    <>
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
              {titleGenerated && (
                <p className="text-xs text-[#1D9E75] mt-1">✓ Title generated — you may edit it freely.</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Type of complaint *</label>
              <select
                value={formData.type}
                onChange={e => {
                  handleInputChange("type", e.target.value);
                  if (e.target.value !== "other") setOtherTypeDetail("");
                  // Reset harassment degree if not sexual harassment
                  if (e.target.value !== "sexual_harassment") {
                    handleInputChange("harassmentDegree", "");
                  }
                }}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
              >
                {FORMAL_COMPLAINT_CATEGORIES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Harassment Degree - Only show for sexual harassment */}
              {formData.type === "sexual_harassment" && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Degree of harassment *
                    <span className="ml-2 font-normal text-gray-400">(Based on RA 11313)</span>
                  </label>
                  <Select
                    value={formData.harassmentDegree ?? ""}
                    onValueChange={(value) => handleInputChange("harassmentDegree", value as HarassmentDegree)}
                  >
                    <SelectTrigger className="w-full text-sm border-gray-300 h-10 text-left">
                      <SelectValue placeholder="Select degree">
                        {HARASSMENT_DEGREE_OPTIONS.find((opt) => opt.value === formData.harassmentDegree)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {HARASSMENT_DEGREE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="items-start">
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-gray-500">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === "other" && (
                <input
                  type="text"
                  value={otherTypeDetail}
                  onChange={e => setOtherTypeDetail(e.target.value)}
                  placeholder="Please specify the type of complaint"
                  className="mt-2 w-full text-sm px-3 py-2 border border-[#1D9E75]/60 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              )}
              <div className="text-xs text-blue-700 mt-1 bg-blue-50 border border-blue-100 rounded px-2 py-1.5 flex items-start gap-1.5">
                <svg className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>This complaint form covers offenses under the <a href="https://www.officialgazette.gov.ph/downloads/2019/04apr/20190417-RA-11313-RRD.pdf" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900">Safe Spaces Act (RA 11313)</a> and the <a href="https://www.officialgazette.gov.ph/1995/02/14/republic-act-no-7877/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900">Anti-Sexual Harassment Act (RA 7877)</a>.</p>
              </div>
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Date of incident *
                  {hasFieldError('incidentDate') && <span className="text-red-500 ml-2 text-xs">(Required)</span>}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) => handleInputChange("incidentDate", e.target.value)}
                    max={getTodayString()}
                    className={`w-full text-sm pl-10 pr-3 py-2.5 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-colors ${
                      dateError ? "border-red-400 focus:ring-red-500" : 
                      hasFieldError('incidentDate') ? "border-red-300" :
                      formData.incidentDate ? "border-[#1D9E75]/40 bg-[#1D9E75]/5" :
                      "border-gray-300"
                    }`}
                    placeholder="Select date"
                  />
                  {formData.incidentDate && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="h-4 w-4 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {dateError && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {dateError}
                  </p>
                )}
                {formData.incidentDate && !dateError && (
                  <p className="text-xs text-gray-500 mt-1.5 break-words">
                    {new Date(formData.incidentDate + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                )}
              </div>
              <div className="w-full">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Time of incident <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <Select value={formData.incidentTime ?? ""} onValueChange={(value) => handleInputChange("incidentTime", value)}>
                  <SelectTrigger className={`w-full text-sm ${
                    formData.incidentTime ? "border-[#1D9E75]/40 bg-[#1D9E75]/5" : "border-gray-300"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Select time period" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">Morning (AM)</SelectItem>
                    <SelectItem value="PM">Afternoon/Evening (PM)</SelectItem>
                  </SelectContent>
                </Select>
                {formData.incidentTime && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formData.incidentTime === 'AM' ? 'Morning (12:00 AM - 11:59 AM)' : 'Afternoon/Evening (12:00 PM - 11:59 PM)'}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Where it happened *</label>
                <Select value={locationVicinity} onValueChange={setLocationVicinity}>
                  <SelectTrigger className="w-full text-sm border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inside">Inside college vicinity</SelectItem>
                    <SelectItem value="outside">Outside college vicinity</SelectItem>
                    <SelectItem value="online">Online / Digital platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  {locationVicinity === "online" ? "Platform *" : "Location details"} {locationVicinity === "outside" && <span className="text-red-500">*</span>}
                </label>
                {locationVicinity === "online" ? (
                  <Select
                    value={formData.incidentLocation || ""}
                    onValueChange={(value) => handleInputChange("incidentLocation", value)}
                  >
                    <SelectTrigger className="w-full text-sm border-gray-300">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Messenger">Messenger</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Twitter/X">Twitter/X</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="Discord">Discord</SelectItem>
                      <SelectItem value="Telegram">Telegram</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="SMS/Text">SMS/Text Message</SelectItem>
                      <SelectItem value="Zoom">Zoom</SelectItem>
                      <SelectItem value="Google Meet">Google Meet</SelectItem>
                      <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                      <SelectItem value="Other">Other Platform</SelectItem>
                    </SelectContent>
                  </Select>
                ) : locationVicinity === "inside" ? (
                  <div className="space-y-2">
                    {!useCustomLocation ? (
                      <Select
                        value={formData.incidentLocation || ""}
                        onValueChange={(value) => handleInputChange("incidentLocation", value)}
                      >
                        <SelectTrigger className="w-full text-sm border-gray-300">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.length === 0 ? (
                            <SelectItem value="__no_locations__" disabled>
                              No locations available — use custom location
                            </SelectItem>
                          ) : (
                            locations
                              .filter((loc) => loc.name && loc.name.trim() !== "")
                              .map((loc) => (
                              <SelectItem key={loc.id} value={loc.name}>
                                {loc.name} <span className="text-gray-400 text-xs ml-2">({loc.category})</span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.incidentLocation || ""}
                        onChange={(e) => handleInputChange("incidentLocation", e.target.value)}
                        placeholder="Enter custom location"
                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomLocation(!useCustomLocation);
                        if (!useCustomLocation) {
                          handleInputChange("incidentLocation", "");
                        }
                      }}
                      className="text-xs text-[#1D9E75] hover:text-[#178F65] underline"
                    >
                      {useCustomLocation ? "Use location list" : "Enter custom location"}
                    </button>
                  </div>
                ) : (
                  <Input
                    value={formData.incidentLocation || ""}
                    onChange={(e) => handleInputChange("incidentLocation", e.target.value)}
                    placeholder={locationVicinity === "outside" ? "Barangay, city, or street" : "Building, room, department"}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                )}
              </div>
            </div>

            {/* Map - Only show for outside college vicinity */}
            {locationVicinity === "outside" && (
              <div className="border border-gray-200 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Pin exact location on map</span>
                    <span className="text-xs text-gray-400">(optional)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mapCoordinates && (
                      <span className="text-xs text-[#1D9E75] font-medium">✓ Location pinned</span>
                    )}
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        isMapExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isMapExpanded && (
                  <div className="mt-4">
                    <LocationMapPicker
                      onLocationSelect={(lat, lng, address) => setMapCoordinates({ lat, lng, address })}
                      initialLat={mapCoordinates?.lat}
                      initialLng={mapCoordinates?.lng}
                      centerLat={selectedCity ? CITY_COORDINATES[selectedCity]?.[0] : undefined}
                      centerLng={selectedCity ? CITY_COORDINATES[selectedCity]?.[1] : undefined}
                      selectedCity={selectedCity}
                      selectedBarangay={selectedBarangay}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Info message for inside college vicinity */}
            {locationVicinity === 'inside' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Inside college vicinity:</strong> No need to pin exact location since the incident occurred within the campus.
                </p>
              </div>
            )}

            {/* Witnesses + Additional info */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Witnesses <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <Textarea
                value={formData.witnesses}
                onChange={(e) => handleInputChange("witnesses", e.target.value)}
                placeholder="List any witnesses with their contact information, if available."
                rows={2}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-y min-h-[60px] leading-relaxed focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">{formData.witnesses.length} chars</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Additional information <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <Textarea
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange("additionalInfo", e.target.value)}
                placeholder="Any other relevant context or background."
                rows={2}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-y min-h-[60px] leading-relaxed focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">{formData.additionalInfo.length} chars</span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {/* Written Sworn Statement */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Written Sworn Statement <span className="font-normal text-blue-600">(Optional)</span></p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    You may submit a written sworn statement (sinumpaang salaysay) as supporting evidence if available. 
                    This can strengthen your complaint but is not required to proceed.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-700">Add supporting files</p>
              <p className="text-xs text-gray-400 mt-1">Upload files or provide external links</p>
              <p className="text-xs font-medium text-blue-600 mt-0.5">For files larger than 50MB, use external links (Google Drive, Dropbox, etc.)</p>
              <p className="text-xs font-semibold text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
                ⚠️ Important: Make sure external links are set to "Public" or "Anyone with link can view"
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                <button
                  type="button"
                  onClick={() => evidenceRef.current?.click()}
                  className="bg-white hover:bg-gray-50 text-gray-600 text-sm px-4 py-2 border border-gray-200 rounded-lg transition-colors duration-150"
                >
                  Browse files (Direct Upload)
                </button>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(true)}
                  className="bg-[#1D9E75] hover:bg-[#178F65] text-white text-sm px-4 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2 justify-center"
                >
                  <Cloud className="h-4 w-4" />
                  Add Files or Links
                </button>
              </div>
              <input
                ref={evidenceRef}
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,video/mpeg,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {(formData.evidence.length > 0 || evidenceLinks.length > 0) && (
              <div className="space-y-4">
                {formData.evidence.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      {formData.evidence.length} file{formData.evidence.length !== 1 ? "s" : ""} selected
                    </p>
                    <div className="space-y-2">
                      {formData.evidence.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <span className={`text-xs flex-shrink-0 ${file.size > 4 * 1024 * 1024 ? "text-red-500 font-medium" : "text-gray-400"}`}>
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEvidence(index)}
                            className="text-xs text-red-600 hover:text-red-700 px-2 py-1 border border-red-200 rounded bg-red-50 hover:bg-red-100 transition-colors duration-150 flex-shrink-0 ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evidenceLinks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      {evidenceLinks.length} external link{evidenceLinks.length !== 1 ? "s" : ""} added
                    </p>
                    <div className="space-y-2">
                      {evidenceLinks.map((link, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <Cloud className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <a 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-700 hover:text-blue-900 truncate underline"
                            >
                              {link}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEvidenceLinks(prev => prev.filter((_, i) => i !== index))}
                            className="text-xs text-red-600 hover:text-red-700 px-2 py-1 border border-red-200 rounded bg-red-50 hover:bg-red-100 transition-colors duration-150 flex-shrink-0 ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-gray-600">Accepted file types:</p>
              <p className="text-xs text-gray-500">• Images: JPG, PNG, GIF, WEBP, BMP</p>
              <p className="text-xs text-gray-500">• Videos: MP4, WEBM, MPEG</p>
              <p className="text-xs text-gray-500">• Documents: PDF, DOC, DOCX</p>
              <p className="text-xs text-gray-500">• Maximum 50 MB per file</p>
              <p className="text-xs text-blue-600 mt-1">You may include a <strong>written sworn statement</strong> if available.</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Review the details below before submitting. Once submitted, your complaint will be forwarded to the DEIU office for processing.</p>
            </div>

            {isAnonymous && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Anonymous submission</p>
                  <p className="text-xs text-blue-700 mt-0.5">Your personal information will not be disclosed to the respondent.</p>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Complainant</p>
                <p className="text-sm text-gray-700">{formData.complainantName}</p>
                <p className="text-sm text-gray-500">{formData.complainantAddress}</p>
                <p className="text-sm text-gray-500">{formData.complainantContact}</p>
              </div>
              <div className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Respondent</p>
                <p className="text-sm text-gray-700">{formData.respondentName || "—"}</p>
                <p className="text-sm text-gray-500">{formData.respondentDepartment || ""}</p>
              </div>
              <div className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Incident</p>
                <p className="text-sm font-medium text-gray-900">{formData.title}</p>
                <p className="text-sm text-gray-500 mt-1">{FORMAL_COMPLAINT_CATEGORIES.find(t => t.value === formData.type)?.label} · {formData.incidentDate}</p>
                <p className="text-sm text-gray-500">{formData.incidentLocation}</p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{formData.description}</p>
              </div>
              <div className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Supporting files</p>
                {formData.evidence.length === 0 && evidenceLinks.length === 0 ? (
                  <p className="text-sm text-gray-400">No files or links provided</p>
                ) : (
                  <div className="space-y-4">
                    {/* Uploaded Files */}
                    {formData.evidence.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">{formData.evidence.length} file(s) attached</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {formData.evidence.map((file, index) => {
                            const isImage = file.type.startsWith('image/');
                            const isVideo = file.type.startsWith('video/');
                            const fileUrl = URL.createObjectURL(file);
                            
                            return (
                              <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                {isImage && (
                                  <div className="aspect-square">
                                    <img 
                                      src={fileUrl} 
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                {isVideo && (
                                  <div className="aspect-square bg-gray-900 relative">
                                    <video 
                                      src={fileUrl}
                                      className="w-full h-full object-cover cursor-pointer"
                                      controls
                                      preload="metadata"
                                    />
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
                                  <p className="text-xs text-white truncate font-medium">{file.name}</p>
                                  <p className="text-xs text-gray-300">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* External Links */}
                    {evidenceLinks.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">{evidenceLinks.length} external link(s)</p>
                        <div className="space-y-2">
                          {evidenceLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <Cloud className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <a 
                                href={link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-700 hover:text-blue-900 truncate underline flex-1"
                              >
                                {link}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const STEP_LABELS = ["Your information", "Respondent", "Incident details", "Supporting files", "Review"];

  return (
    <div className="min-h-full">
      {/* Page header - full width */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Formal complaint filing</h1>
        <p className="text-sm text-gray-400 mt-1">
          Complete all steps to file a formal complaint with the DEIU office.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN - Main Form (60% on desktop) */}
        <div className="w-full lg:w-[60%] flex-shrink-0">

          {/* Privacy notice */}
          <div
            className="flex items-start gap-3 p-4 rounded-2xl mb-6"
            style={{ background: "#F0FDF4", border: "0.5px solid #86EFAC" }}
          >
            <div className="rounded-lg p-2 shrink-0" style={{ background: "#DCFCE7" }}>
              <Shield className="h-4 w-4 text-[#1D9E75]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#178F65]">Your privacy is protected</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4B7C55" }}>
                All submitted information is handled with strict confidentiality. Your identity will not be disclosed to the respondent without your consent.
              </p>
            </div>
          </div>

        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center">
            {STEP_LABELS.map((label, index) => {
              const step = index + 1;
              const isDone = step < currentStep;
              const isActive = step === currentStep;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-150 flex-shrink-0 ${
                      isDone ? "bg-[#1D9E75] text-white" :
                      isActive ? "bg-green-700 text-white ring-2 ring-[#1D9E75]/40" :
                      "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}>
                      {isDone ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step}
                    </div>
                    <span className={`hidden sm:block text-xs mt-1 text-center whitespace-nowrap ${isActive ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                      {label}
                    </span>
                    {/* On mobile: show only active label */}
                    {isActive && (
                      <span className="sm:hidden text-xs mt-1 text-center text-gray-900 font-medium whitespace-nowrap">
                        {label}
                      </span>
                    )}
                  </div>
                  {index < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-px mx-1 sm:mx-2 mb-4 sm:mb-5 ${isDone ? "bg-[#1D9E75]" : "bg-gray-200"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-3 bg-gray-100 rounded-full h-1">
            <div
              className="bg-[#1D9E75] h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEP_LABELS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Upload progress */}
        {isSubmitting && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1D9E75] border-t-transparent" />
              <span className="text-sm text-gray-700">{currentUploadStage}</span>
            </div>
            <div className="bg-gray-100 rounded-full h-1">
              <div className="bg-[#1D9E75] h-1 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{uploadProgress}%</p>
          </div>
        )}

        {/* Main form card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="mb-5 pb-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {STEP_LABELS[currentStep - 1]}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {[
                "Your personal details as the complainant.",
                "Details about the person you are reporting.",
                "What happened, when, and where.",
                "Attach supporting evidence and files (sworn statement optional).",
                "Confirm all details are accurate before submitting."
              ][currentStep - 1]}
            </p>
          </div>
          {renderStepContent()}
        </div>

        {/* Navigation footer */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
                className="bg-white hover:bg-gray-50 text-gray-600 text-sm px-4 py-2 border border-gray-200 rounded-lg transition-colors duration-150"
              >
                Back
              </button>
            )}
          </div>
          <div>
            {currentStep < 5 && (
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-[#1D9E75] hover:bg-[#178F65] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors duration-150"
                >
                  Continue
                </button>
              </div>
            )}
            {currentStep === 5 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !isFormValid()}
                className="bg-[#1D9E75] hover:bg-[#178F65] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit complaint
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        </div>
        {/* END LEFT COLUMN */}

        {/* RIGHT COLUMN - Sticky Summary Card (40% on desktop, hidden on mobile) */}
        <div className="hidden lg:block lg:w-[40%] flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            
            {/* Progress Summary Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Your Progress</h3>
              <p className="text-xs text-gray-500 mb-4">Step {currentStep} of {STEP_LABELS.length}</p>
              
              <div className="space-y-2.5">
                {/* Full Name */}
                <div className="flex items-start gap-2">
                  {formData.complainantName || isAnonymous ? (
                    <div className="w-4 h-4 rounded-full bg-[#1D9E75]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Full Name</p>
                    {isAnonymous ? (
                      <p className="text-xs text-gray-500 italic">Anonymous</p>
                    ) : formData.complainantName ? (
                      <p className="text-xs text-[#1D9E75] truncate">{formData.complainantName}</p>
                    ) : (
                      <p className="text-xs text-gray-400">Not filled</p>
                    )}
                  </div>
                </div>

                {/* Complete Address */}
                <div className="flex items-start gap-2">
                  {formData.complainantAddress ? (
                    <div className="w-4 h-4 rounded-full bg-[#1D9E75]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Complete Address</p>
                    {formData.complainantAddress ? (
                      <p className="text-xs text-[#1D9E75] line-clamp-2">{formData.complainantAddress}</p>
                    ) : (
                      <p className="text-xs text-gray-400">Not filled</p>
                    )}
                  </div>
                </div>

                {/* Contact Number */}
                <div className="flex items-start gap-2">
                  {formData.complainantContact ? (
                    <div className="w-4 h-4 rounded-full bg-[#1D9E75]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Contact Number</p>
                    {formData.complainantContact ? (
                      <p className="text-xs text-[#1D9E75]">{formData.complainantContact}</p>
                    ) : (
                      <p className="text-xs text-gray-400">Not filled</p>
                    )}
                  </div>
                </div>

                {/* Respondent */}
                {currentStep >= 2 && (
                  <div className="flex items-start gap-2">
                    {formData.respondentName ? (
                      <div className="w-4 h-4 rounded-full bg-[#1D9E75]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-2.5 h-2.5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">Respondent Info</p>
                      {formData.respondentName ? (
                        <p className="text-xs text-[#1D9E75] truncate">{formData.respondentName}</p>
                      ) : (
                        <p className="text-xs text-gray-400">Not filled</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Incident Details */}
                {currentStep >= 3 && (
                  <div className="flex items-start gap-2">
                    {formData.description && formData.incidentDate ? (
                      <div className="w-4 h-4 rounded-full bg-[#1D9E75]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-2.5 h-2.5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">Incident Details</p>
                      {formData.description && formData.incidentDate ? (
                        <div>
                          <p className="text-xs text-[#1D9E75] font-medium">
                            {FORMAL_COMPLAINT_CATEGORIES.find(c => c.value === formData.type)?.label || "Incident"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(formData.incidentDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {formData.incidentTime && ` • ${formData.incidentTime === 'AM' ? 'Morning' : 'Afternoon/Evening'}`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Not filled</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Supporting Files */}
                {currentStep >= 4 && (
                  <div className="flex items-start gap-2">
                    {(formData.evidence.length > 0 || evidenceLinks.length > 0) ? (
                      <div className="w-4 h-4 rounded-full bg-[#1D9E75]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-2.5 h-2.5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">Supporting Files</p>
                      {(formData.evidence.length > 0 || evidenceLinks.length > 0) ? (
                        <p className="text-xs text-[#1D9E75]">
                          {formData.evidence.length} file(s){evidenceLinks.length > 0 && `, ${evidenceLinks.length} link(s)`}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">No files yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Reassurance Box */}
            <div className="bg-green-50 border border-[#1D9E75]/25 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-2">
                <Shield className="h-4 w-4 text-[#1D9E75] flex-shrink-0 mt-0.5" />
                <h4 className="text-xs font-bold text-[#0D5F47]">Your information is safe</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-[#178F65]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#1D9E75] mt-0.5">•</span>
                  <span>All submitted data is encrypted</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#1D9E75] mt-0.5">•</span>
                  <span>Your identity will not be disclosed to the respondent without your consent</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#1D9E75] mt-0.5">•</span>
                  <span>Reference your case by Case ID only if you choose to be anonymous</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
        {/* END RIGHT COLUMN */}

      </div>
      {/* END TWO-COLUMN LAYOUT */}

      {/* Evidence Submission Modal */}
      <EvidenceSubmissionModal
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
        onSubmit={handleEvidenceSubmit}
        maxFileSize={50}
      />
    </div>
  );
};

export default FormalComplaint;
