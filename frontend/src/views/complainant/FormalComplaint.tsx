import React, { useState, useRef } from "react";
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
import { ComplaintFormData, ComplaintType, Severity } from "../../types/complaints";
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { NotificationService } from '../../services/notificationService';
import LocationMapPicker from "../../components/forms/LocationMapPicker";
import { FormTip, FormStepHeader, FormTipsList } from "../../components/forms/FormAssistant";
import { getFormSuggestions, getStepTip, validateFormCompletion, getEncouragingMessage } from "../../services/formAssistant.service";

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

const FormalComplaint = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const evidenceRef = useRef<HTMLInputElement>(null);

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
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const [otherTypeDetail, setOtherTypeDetail] = useState("");

  const [formData, setFormData] = useState<ComplaintFormData>({
    // Auto-filled from user profile
    complainantName: currentUser?.displayName || currentUser?.email || "",
    complainantAddress: "",
    complainantContact: "",
    
    // Respondent Information
    respondentName: "",
    respondentAddress: "",
    respondentPosition: "",
    respondentDepartment: "",
    
    // Incident Details
    title: "",
    description: "",
    statementOfFacts: "",
    type: ComplaintType.MISCONDUCT,
    severity: Severity.MEDIUM,
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

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [unknownRespondent, setUnknownRespondent] = useState(false);

  const departments = [
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

  const complaintTypes = [
    { value: "sexual_harassment", label: "Sexual Harassment" },
    { value: "gender_based_harassment", label: "Gender-Based Harassment" },
    { value: "discrimination", label: "Gender-Based Discrimination" },
    { value: "bullying", label: "Bullying/Harassment" },
    { value: "online_harassment", label: "Online Sexual Harassment" },
    { value: "other", label: "Other" }
  ];

  const handleInputChange = (field: string, value: any) => {
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

    // Validate contact number to only allow numbers (unless anonymous)
    if (field === "complainantContact" && !isAnonymous) {
      // Remove any non-digit characters
      const numberOnly = value.replace(/\D/g, '');
      
      // Update with numbers only
      setFormData(prev => ({ ...prev, [field]: numberOnly }));
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

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mpeg', 'video/quicktime'];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      // Check file type
      const isImage = allowedImageTypes.includes(file.type);
      const isVideo = allowedVideoTypes.includes(file.type);

      if (!isImage && !isVideo) {
        invalidFiles.push(`${file.name} (only images and videos allowed)`);
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
        title: "Invalid Files",
        description: `${invalidFiles.length} file(s) not allowed:\n${invalidFiles.join('\n')}`,
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
          title: "Files Added",
          description: `${validFiles.length} file(s) added successfully`,
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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // If anonymous, the fields will be auto-filled with "Anonymous" and "Not Disclosed"
        // So we can consider it valid. Otherwise, require actual user input
        if (isAnonymous) {
          console.log('✓ Step 1 validation: PASS (Anonymous mode)');
          return true;
        }
        const step1Valid = !!(formData.complainantName && formData.complainantAddress && formData.complainantContact);
        console.log('🔍 Step 1 validation:', {
          step1Valid,
          complainantName: formData.complainantName,
          complainantAddress: formData.complainantAddress,
          complainantContact: formData.complainantContact
        });
        return step1Valid;
      case 2:
        const step2Valid = !!(formData.respondentName);
        console.log('🔍 Step 2 validation:', {
          step2Valid,
          respondentName: formData.respondentName,
        });
        return step2Valid;
      case 3:
        const step3Valid = !!(formData.title && formData.description && formData.description.trim().length >= 20 && formData.incidentDate && formData.incidentLocation && (formData.type !== "other" || otherTypeDetail.trim().length > 0));
        console.log('🔍 Step 3 validation:', {
          step3Valid,
          title: formData.title,
          description: formData.description,
          incidentDate: formData.incidentDate,
          incidentLocation: formData.incidentLocation
        });
        return step3Valid;
      case 4:
        const step4Valid = formData.evidence.length > 0;
        console.log('🔍 Step 4 validation:', {
          step4Valid,
          evidenceCount: formData.evidence.length
        });
        return step4Valid;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      toast({
        title: "Incomplete Information",
        description: currentStep === 4 
          ? "Please upload at least one evidence file before proceeding."
          : "Please fill in all required fields before proceeding.",
        variant: "destructive"
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
    // Check for date validation error
    if (dateError) {
      toast({
        title: "Error",
        description: "Hindi pwedeng mag-submit kapag may error sa incident date. Ayusin muna ang petsa.",
        variant: "destructive"
      });
      return;
    }

    // Additional check: validate incident date one more time before submission
    if (formData.incidentDate && formData.incidentDate > getTodayString()) {
      toast({
        title: "Error", 
        description: "Hindi pwedeng future date ang incident date. Piliin ang nakaraang petsa o ngayon.",
        variant: "destructive"
      });
      return;
    }

    if (!validateStep(4)) {
      toast({
        title: "Required Evidence Missing",
        description: "Please upload at least one evidence file before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to submit a complaint.",
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
        respondentPosition: formData.respondentPosition,
        respondentDepartment: formData.respondentDepartment,
        
        // Incident details
        title: formData.title,
        description: formData.description,
        statementOfFacts: formData.statementOfFacts,
        type: formData.type,
        category: formData.type, // Alias for compatibility
        severity: formData.severity,
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
        status: 'submitted',
        stage: 'filing',
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
      console.log('✅ Complaint document created:', complaintId);
      setUploadProgress(30);

      // Show immediate feedback to user
      toast({
        title: "Complaint Registered",
        description: `Your complaint has been registered. Case ID: ${complaintId}. Now uploading files to Cloudinary...`,
        duration: 3000,
      });

      // Step 2: Upload files to Cloudinary
      let evidenceURLs: string[] = [];

      try {
        console.log('☁️ Starting Cloudinary file uploads...');
        setCurrentUploadStage('Uploading files to Cloudinary...');
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
          title: "File Upload Warning",
          description: "Some files couldn't be uploaded, but your complaint was saved. You can add files later.",
          variant: "default"
        });
      }

      // Step 3: Update complaint with Cloudinary URLs
      console.log('🔄 Updating complaint with Cloudinary URLs...');
      setCurrentUploadStage('Finalizing submission...');
      
      await updateDoc(doc(db, 'complaints', complaintId), {
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
      
      toast({
        title: "Complaint Submitted Successfully!",
        description: `Your formal complaint has been filed. Case ID: ${complaintId}`,
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

  // AI-based title generation from description + complaint type
  const generateTitle = async () => {
    if (formData.description.trim().length < 20) return;
    setIsGeneratingTitle(true);
    try {
      const desc = formData.description.toLowerCase();
      // Use the currently selected type — falls back to misconduct if unset
      const type = formData.type || ComplaintType.MISCONDUCT;

      const typeLabels: Record<string, string> = {
        harassment: "Harassment",
        bullying: "Bullying",
        discrimination: "Discrimination",
        misconduct: "Misconduct",
        abuse: "Abuse of Authority",
        grade_dispute: "Grade Dispute",
        policy_violation: "Policy Violation",
        gender_harassment: "Gender-Based Harassment",
        sexual_harassment: "Sexual Harassment",
        other: "Concern",
      };
      const typeLabel = typeLabels[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

      // Extract subject keywords from description
      const personKeywords = [
        "professor", "instructor", "teacher", "student", "classmate", "staff",
        "faculty", "dean", "coordinator", "colleague", "admin", "officer",
        "security guard", "janitor", "registrar", "guidance",
      ];
      const placeKeywords = [
        "online", "classroom", "dormitory", "laboratory", "hallway",
        "office", "canteen", "campus", "social media", "group chat",
      ];

      const foundPerson = personKeywords.find(k => desc.includes(k));
      const foundPlace  = placeKeywords.find(k => desc.includes(k));

      let generated: string;
      if (foundPerson && foundPlace) {
        const person = foundPerson.charAt(0).toUpperCase() + foundPerson.slice(1);
        const place  = foundPlace.charAt(0).toUpperCase() + foundPlace.slice(1);
        generated = `${typeLabel} by a ${person} in the ${place}`;
      } else if (foundPerson) {
        const person = foundPerson.charAt(0).toUpperCase() + foundPerson.slice(1);
        generated = `${typeLabel} Involving a ${person}`;
      } else if (foundPlace) {
        const place = foundPlace.charAt(0).toUpperCase() + foundPlace.slice(1);
        generated = `${typeLabel} Incident at the ${place}`;
      } else {
        generated = `${typeLabel} Incident`;
      }

      handleInputChange("title", generated);
      setTitleGenerated(true);
    } finally {
      setIsGeneratingTitle(false);
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
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Full name *</label>
              <Input
                value={formData.complainantName}
                onChange={(e) => handleInputChange("complainantName", e.target.value)}
                placeholder="Enter your full legal name"
                disabled={isAnonymous}
                className={`w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isAnonymous ? "bg-gray-100 text-gray-400" : "bg-white text-gray-900"}`}
              />
              {formData.complainantName && !isAnonymous && (
                <FormTip
                  message={getFormSuggestions("complainantName", formData.complainantName, 1, formData)?.message || ""}
                  type={getFormSuggestions("complainantName", formData.complainantName, 1, formData)?.type || "info"}
                  show={!!getFormSuggestions("complainantName", formData.complainantName, 1, formData)}
                />
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Complete address *</label>
              <Textarea
                value={formData.complainantAddress}
                onChange={(e) => handleInputChange("complainantAddress", e.target.value)}
                placeholder="Street, barangay, city"
                disabled={isAnonymous}
                className={`w-full text-sm px-3 py-2 border border-gray-300 rounded-lg resize-y min-h-[72px] leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-transparent ${isAnonymous ? "bg-gray-100 text-gray-400" : "bg-white text-gray-900"}`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Contact number *</label>
              <Input
                value={formData.complainantContact}
                onChange={(e) => handleInputChange("complainantContact", e.target.value)}
                placeholder="e.g. 09171234567"
                disabled={isAnonymous}
                className={`w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isAnonymous ? "bg-gray-100 text-gray-400" : "bg-white text-gray-900"}`}
              />
              {formData.complainantContact && !isAnonymous && (
                <FormTip
                  message={getFormSuggestions("complainantContact", formData.complainantContact, 1, formData)?.message || ""}
                  type={getFormSuggestions("complainantContact", formData.complainantContact, 1, formData)?.type || "info"}
                  show={!!getFormSuggestions("complainantContact", formData.complainantContact, 1, formData)}
                />
              )}
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
                    handleInputChange("respondentPosition", "Unknown");
                    handleInputChange("respondentDepartment", "Unknown");
                  } else {
                    handleInputChange("respondentName", "");
                    handleInputChange("respondentPosition", "");
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
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Full name of respondent *</label>
                  <Input
                    value={formData.respondentName}
                    onChange={(e) => handleInputChange("respondentName", e.target.value)}
                    placeholder="Enter respondent's full name"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Position <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                    <Select
                      value={formData.respondentPosition}
                      onValueChange={(value) => handleInputChange("respondentPosition", value === "not-specified" ? "" : value)}
                    >
                      <SelectTrigger className="w-full text-sm border-gray-300 h-10">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-specified">Not specified</SelectItem>
                        {positions.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Department <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                    <Select
                      value={formData.respondentDepartment}
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
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Physical description or identifying details
                {unknownRespondent && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Textarea
                placeholder={
                  unknownRespondent
                    ? "Describe the person — approximate age, height, clothing, where they are usually seen, etc."
                    : "Optional — any additional identifying details"
                }
                rows={3}
                value={formData.respondentAddress}
                onChange={(e) => handleInputChange("respondentAddress", e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-y min-h-[72px] leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {unknownRespondent && (
                <p className="text-xs text-gray-400 mt-1">
                  Since the identity is unknown, please describe any details that may help identify the respondent.
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description *</label>
                <span className={`text-xs font-medium ${
                  formData.description.trim().length === 0 ? "text-gray-400" :
                  formData.description.trim().length < 20 ? "text-red-500" :
                  "text-green-600"
                }`}>
                  {formData.description.trim().length} / 20 min
                </span>
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => {
                  handleInputChange("description", e.target.value);
                  if (titleGenerated) setTitleGenerated(false);
                }}
                placeholder="Describe what happened in detail — include who was involved, what was said or done, and any other relevant context."
                rows={4}
                className={`w-full text-sm px-3 py-2 border rounded-lg bg-white text-gray-900 resize-y min-h-[90px] leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  formData.description.trim().length > 0 && formData.description.trim().length < 20
                    ? "border-red-400"
                    : formData.description.trim().length >= 20
                    ? "border-green-500"
                    : "border-gray-300"
                }`}
              />
              {formData.description.trim().length > 0 && formData.description.trim().length < 20 && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {20 - formData.description.trim().length} more characters needed.
                </p>
              )}
            </div>

            {/* Title with Generate button */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Complaint title *
                <span className="ml-2 normal-case font-normal text-gray-400">Auto-generated from description</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={formData.title}
                  onChange={(e) => { handleInputChange("title", e.target.value); setTitleGenerated(false); }}
                  placeholder="Write or auto-generate a title"
                  className={`flex-1 text-sm px-3 py-2 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent ${titleGenerated ? "border-green-500 bg-green-50" : "border-gray-300"}`}
                />
                <button
                  type="button"
                  onClick={generateTitle}
                  disabled={formData.description.trim().length < 20 || isGeneratingTitle}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors duration-150 flex-shrink-0"
                >
                  {isGeneratingTitle ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {isGeneratingTitle ? "Generating..." : "Generate"}
                </button>
              </div>
              {titleGenerated && (
                <p className="text-xs text-green-600 mt-1">Title generated — you may edit it freely.</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Type of complaint *</label>
              <select
                value={formData.type}
                onChange={e => {
                  handleInputChange("type", e.target.value);
                  if (e.target.value !== "other") setOtherTypeDetail("");
                }}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {complaintTypes.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {formData.type === "other" && (
                <input
                  type="text"
                  value={otherTypeDetail}
                  onChange={e => setOtherTypeDetail(e.target.value)}
                  placeholder="Please specify the type of complaint"
                  className="mt-2 w-full text-sm px-3 py-2 border border-green-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              )}
              <p className="text-xs text-blue-700 mt-1 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                This complaint form covers offenses under the <strong>Safe Spaces Act (RA 11313)</strong> and the <strong>Anti-Sexual Harassment Act (RA 7877)</strong>.
              </p>
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Date of incident *</label>
                <Input
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) => handleInputChange("incidentDate", e.target.value)}
                  max={getTodayString()}
                  className={`w-full text-sm px-3 py-2 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent ${dateError ? "border-red-400" : "border-gray-300"}`}
                />
                {dateError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {dateError}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Time of incident <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <Input
                  type="time"
                  value={formData.incidentTime || ""}
                  onChange={(e) => handleInputChange("incidentTime", e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Where it happened *</label>
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
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Location details {locationVicinity === "outside" && <span className="text-red-500">*</span>}
                </label>
                <Input
                  value={formData.incidentLocation || ""}
                  onChange={(e) => handleInputChange("incidentLocation", e.target.value)}
                  placeholder={locationVicinity === "outside" ? "Barangay, city, or street" : locationVicinity === "online" ? "Platform name, app, or URL (e.g. Facebook, Messenger)" : "Building, room, department"}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Map */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Pin exact location</span>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <LocationMapPicker
                onLocationSelect={(lat, lng, address) => setMapCoordinates({ lat, lng, address })}
                initialLat={mapCoordinates?.lat}
                initialLng={mapCoordinates?.lng}
                centerLat={selectedCity ? CITY_COORDINATES[selectedCity]?.[0] : undefined}
                centerLng={selectedCity ? CITY_COORDINATES[selectedCity]?.[1] : undefined}
                selectedCity={selectedCity}
                selectedBarangay={selectedBarangay}
              />
              {mapCoordinates && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-green-600" />
                  Pinned: {mapCoordinates.address}
                </p>
              )}
            </div>

            {/* Witnesses + Additional info */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Witnesses <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <Textarea
                value={formData.witnesses}
                onChange={(e) => handleInputChange("witnesses", e.target.value)}
                placeholder="List any witnesses with their contact information, if available."
                rows={2}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-y min-h-[60px] leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Additional information <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <Textarea
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange("additionalInfo", e.target.value)}
                placeholder="Any other relevant context or background."
                rows={2}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-y min-h-[60px] leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {/* Written Sworn Statement */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <FileText className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Written Sworn Statement Required</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You must submit a written sworn statement (sinumpaang salaysay) as a supporting document. 
                    This is required for the formal processing of your complaint. Upload a photo or scanned copy.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-700">Add supporting files</p>
              <p className="text-xs text-gray-400 mt-1">Images and videos only</p>
              <p className="text-xs font-medium text-red-500 mt-0.5">Maximum 50 MB per file</p>
              <button
                type="button"
                onClick={() => evidenceRef.current?.click()}
                className="mt-4 bg-white hover:bg-gray-50 text-gray-600 text-sm px-4 py-2 border border-gray-200 rounded-lg transition-colors duration-150"
              >
                Browse files
              </button>
              <input
                ref={evidenceRef}
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,video/mpeg"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

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

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-gray-600">Accepted file types:</p>
              <p className="text-xs text-gray-500">• Images: JPG, PNG, GIF, WEBP, BMP</p>
              <p className="text-xs text-gray-500">• Videos: MP4, WEBM, MPEG</p>
              <p className="text-xs text-gray-500">• Maximum 50 MB per file</p>
              <p className="text-xs text-gray-500 mt-1">Include your <strong>written sworn statement</strong> as one of the files.</p>
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
                <p className="text-sm text-gray-500">{formData.respondentPosition || ""}{formData.respondentDepartment ? ` · ${formData.respondentDepartment}` : ""}</p>
              </div>
              <div className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Incident</p>
                <p className="text-sm font-medium text-gray-900">{formData.title}</p>
                <p className="text-sm text-gray-500 mt-1">{complaintTypes.find(t => t.value === formData.type)?.label} · {formData.incidentDate}</p>
                <p className="text-sm text-gray-500">{formData.incidentLocation}</p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{formData.description}</p>
              </div>
              <div className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Supporting files</p>
                {formData.evidence.length === 0 ? (
                  <p className="text-sm text-gray-400">No files selected</p>
                ) : (
                  <ul className="space-y-1">
                    {formData.evidence.map((file, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                        {file.name}
                      </li>
                    ))}
                  </ul>
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto w-full">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-medium text-gray-900">Formal complaint filing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete all steps to file a formal complaint with the DEIU office.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="mb-6 flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            All submitted information is handled with strict confidentiality. Your identity will not be disclosed to the respondent without your consent.
          </p>
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
                      isDone ? "bg-green-600 text-white" :
                      isActive ? "bg-green-700 text-white ring-2 ring-green-300" :
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
                    <div className={`flex-1 h-px mx-1 sm:mx-2 mb-4 sm:mb-5 ${isDone ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-3 bg-gray-100 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEP_LABELS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Upload progress */}
        {isSubmitting && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
              <span className="text-sm text-gray-700">{currentUploadStage}</span>
            </div>
            <div className="bg-gray-100 rounded-full h-1">
              <div className="bg-green-500 h-1 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
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
                "Attach your written sworn statement and other supporting files.",
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
              <button
                type="button"
                onClick={() => {
                  if (validateStep(currentStep)) {
                    setCurrentStep(prev => Math.min(prev + 1, 5));
                  } else {
                    toast({
                      title: "Incomplete information",
                      description: currentStep === 4
                        ? "Please upload at least one file before proceeding."
                        : "Please fill in all required fields before proceeding.",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!validateStep(currentStep)}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors duration-150"
              >
                Continue
              </button>
            )}
            {currentStep === 5 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2"
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
    </div>
  );
};

export default FormalComplaint;
