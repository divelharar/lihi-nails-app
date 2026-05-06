import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Heart, Star, CheckCircle, Settings, User, ArrowRight, CalendarPlus, X, Menu, ChevronLeft, ChevronRight, Edit2, ChevronDown, ChevronUp, PlusCircle, MessageCircle, AlertCircle, Bell, BarChart3, Megaphone, Copy, Check, TrendingUp, Plus, Trash2, CalendarOff } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- החיבור המקורי והנכון שלך ל-Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDlXeIC2YiBFk2uq_b81AQljiT-Bmf-QgI",
  authDomain: "lihi-nails.firebaseapp.com",
  projectId: "lihi-nails",
  storageBucket: "lihi-nails.firebasestorage.app",
  messagingSenderId: "504139844570",
  appId: "1:504139844570:web:79e7779b643c7acf464ee3"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Init Error:", e);
}

// --- הגדרות ברירת מחדל לזמינות ---
const DEFAULT_SCHEDULE = {
  0: ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00'], // ראשון
  1: ['17:00', '18:00', '19:00'], // שני
  2: ['09:00', '10:00', '11:00', '12:00', '13:00'], // שלישי
  3: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00'], // רביעי
  4: ['09:00', '10:00', '11:00', '12:00', '13:00'], // חמישי
  5: ['09:00', '10:00', '11:00', '12:00'], // שישי
  6: [] // שבת
};

const ALL_POSSIBLE_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const DEFAULT_SERVICES = [
  { id: 'gel_anatomy', label: 'לק ג\'ל אנטומי - 150 ₪', hours: 1, price: 150 },
  { id: 'gel_refill', label: 'מילוי בג\'ל בנייה - 160 ₪', hours: 1, price: 160 },
  { id: 'gel_feet', label: 'לק ג\'ל רגליים - 130 ₪', hours: 1, price: 130 },
  { id: 'new_build', label: 'בנייה חדשה - 300 ₪', hours: 2, price: 300 } 
];

const DEFAULT_EXTRAS = [
  { id: 'extra_nail', label: '⭐ השלמת ציפורן - 10 ₪', price: 10 },
  { id: 'extra_art', label: '🎨 קישוטים בסיסיים - 10 ₪', price: 10 },
  { id: 'extra_fix', label: '🛠️ תיקון ציפורן - 20 ₪', price: 20 }
];

const DEFAULT_WHATSAPP_TEMPLATE = `היי [שם_לקוחה] המהממת! 🌸
רציתי לאשר את התור שלך אצל ליהיא ניילס (Lihi Nails):

🗓️ תאריך: [תאריך]
🕒 שעה: [שעה]
💅 טיפולים: [טיפולים]

📍 הכתובת שלנו: ח"ן 1, אשקלון.

מחכה לך לזמן של פינוק! 💖`;

// התיקון העיקרי: מפנה ישירות ללוגו המקומי שלך
const DEFAULT_LOGO_URL = '/LOGO.jpeg';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-600 min-h-screen" dir="ltr">
          <h2 className="text-2xl font-bold mb-4">משהו השתבש 🛠️</h2>
          <pre className="bg-white p-4 rounded-xl shadow-sm text-sm font-mono overflow-auto">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">רענן דף</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <LihiNailsApp />
    </ErrorBoundary>
  );
}

function LihiNailsApp() {
  const [view, setView] = useState('customer');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const [user, setUser] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const [appointments, setAppointments] = useState([]);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [extras, setExtras] = useState(DEFAULT_EXTRAS);
  const [blockedDates, setBlockedDates] = useState([]);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState({});
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);

  useEffect(() => {
    if (!auth) {
      setLoadingData(false);
      return;
    }
    
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        setTimeout(() => { if (!user) setUser({ uid: 'temp' }); }, 2000);
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    // משיכת נתונים ישירות מהתיקיות האמיתיות שלך
    const unsubAppts = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const loadedAppts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(loadedAppts);
      setLoadingData(false);
    }, (err) => {
      console.error(err);
      setLoadingData(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.schedule) setSchedule(data.schedule);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.whatsappTemplate) setWhatsappTemplate(data.whatsappTemplate);
        if (data.services) setServices(data.services);
        if (data.extras) setExtras(data.extras);
        if (data.blockedDates) setBlockedDates(data.blockedDates);
        if (data.blockedTimeSlots) setBlockedTimeSlots(data.blockedTimeSlots);
      } else {
        setDoc(doc(db, 'settings', 'main'), {
          schedule: DEFAULT_SCHEDULE,
          services: DEFAULT_SERVICES,
          extras: DEFAULT_EXTRAS,
          blockedDates: [],
          blockedTimeSlots: {},
          logoUrl: DEFAULT_LOGO_URL,
          whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE
        });
      }
    }, (err) => console.error(err));

    return () => {
      unsubAppts();
      unsubSettings();
    };
  }, [user]);

  const handleAddAppointment = async (newAppt) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, 'appointments'), { ...newAppt, createdAt: Date.now() });
    } catch(e) { console.error("Error adding appt", e); }
  };

  const handleDeleteAppointment = async (id) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch(e) { console.error("Error deleting appt", e); }
  };

  const handleUpdateAppointment = async (id, updatedData) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, 'appointments', id), updatedData);
    } catch(e) { console.error("Error updating appt", e); }
  };

  const handleUpdateSetting = async (field, value) => {
    if (!user || !db) return;
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        [field]: value
      }, { merge: true });
    } catch(e) { console.error("Error updating setting", e); }
  };

  const handleAdminLogin = () => {
    if (pin === '1504') {
      setIsAdminAuthenticated(true);
      setView('admin');
      setPin('');
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  if (loadingData && !user) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center font-sans" dir="rtl">
        <div className="animate-bounce mb-4 text-pink-500">
          <Heart size={48} fill="currentColor" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">טוען את היומן של Lihi Nails... 💅</h2>
      </div>
    );
  }

  // הגנה נוספת, אם נשמר קישור של התמונה הישנה במסד נתונים, אנחנו דורסים אותו
  const isOldImage = logoUrl && logoUrl.includes('images.unsplash.com');
  const finalLogoUrl = isOldImage || !logoUrl || logoUrl.trim() === '' ? DEFAULT_LOGO_URL : logoUrl;
  const handleImageError = (e) => { e.target.onerror = null; e.target.src = DEFAULT_LOGO_URL; };

  return (
    <div className="min-h-screen font-sans text-right bg-cover bg-center bg-fixed relative" dir="rtl" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop')" }}>
      <div className="absolute inset-0 bg-rose-50/85 backdrop-blur-sm"></div>
      
      <div className="relative z-10">
        <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-20">
          <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src={finalLogoUrl} onError={handleImageError} alt="לוגו Lihi Nails" className="w-12 h-12 rounded-full object-cover border-2 border-pink-200 shadow-sm bg-white" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Lihi Nails 💅✨</h1>
                <p className="text-xs text-pink-600 font-bold">האומנות שלי, הציפורניים שלך 💎</p>
              </div>
            </div>
            <button 
              onClick={() => {
                if (view === 'customer') {
                  if (isAdminAuthenticated) {
                    setView('admin');
                  } else {
                    setView('auth');
                  }
                } else {
                  setView('customer');
                }
              }}
              className="p-2 text-gray-400 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-50"
              title={view === 'customer' ? 'כניסת מנהלת' : 'חזרה לתצוגת לקוח'}
            >
              {view === 'customer' ? <Settings size={20} /> : <User size={20} />}
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto min-h-[calc(100vh-80px)] bg-white/95 backdrop-blur-md shadow-2xl sm:rounded-b-3xl overflow-hidden relative border-x border-b border-white/50">
          {view === 'customer' && (
            <CustomerView 
              schedule={schedule}
              blockedDates={blockedDates || []}
              blockedTimeSlots={blockedTimeSlots || {}}
              services={services || []}
              extras={extras || []}
              appointments={appointments} 
              onBook={handleAddAppointment} 
              logoUrl={finalLogoUrl}
            />
          )}
          
          {view === 'auth' && (
            <div className="p-8 flex flex-col items-center justify-center h-full min-h-[60vh] text-center fade-in bg-white/90">
              <img src={finalLogoUrl} onError={handleImageError} alt="לוגו Lihi Nails" className="w-24 h-24 rounded-full border-4 border-pink-100 shadow-md mb-6 object-cover bg-white" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">כניסת מנהלת 👑</h2>
              <p className="text-gray-500 mb-8 text-sm">היי ליהיא! הקלידי את קוד הגישה שלך כדי לנהל את התורים:</p>
              
              <div className="w-full max-w-[250px]">
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className={`text-center text-3xl tracking-[0.5em] w-full p-4 bg-gray-50 border-2 ${pinError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-pink-400'} rounded-2xl outline-none transition-all mb-2`}
                  placeholder="****"
                  maxLength={4}
                  dir="ltr"
                />
                <div className="h-6 mb-4">
                  {pinError && <p className="text-red-500 text-xs font-bold animate-pulse">קוד שגוי, נסי שוב.</p>}
                </div>
                
                <button 
                  onClick={handleAdminLogin}
                  className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-pink-700 transition-colors shadow-lg shadow-pink-200 mb-4"
                >
                  היכנסי ליומן
                </button>
                <button 
                  onClick={() => { setView('customer'); setPin(''); setPinError(false); }}
                  className="text-gray-500 font-medium hover:text-pink-600 underline text-sm"
                >
                  חזרה למסך הראשי
                </button>
              </div>
            </div>
          )}

          {view === 'admin' && (
            <AdminView 
              schedule={schedule}
              blockedDates={blockedDates || []}
              blockedTimeSlots={blockedTimeSlots || {}}
              services={services || []}
              extras={extras || []}
              appointments={appointments} 
              logoUrl={finalLogoUrl}
              whatsappTemplate={whatsappTemplate}
              onUpdateSetting={handleUpdateSetting}
              onDeleteAppointment={handleDeleteAppointment}
              onUpdateAppointment={handleUpdateAppointment}
            />
          )}
        </main>

        {view === 'customer' && (
          <a
            href="http://wa.me/972533033385"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 left-6 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-50 flex items-center justify-center border-2 border-white"
            title="דברי איתי בווצאפ"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </a>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

// ==========================================
//              צד לקוח (Customer View)
// ==========================================
function CustomerView({ schedule, blockedDates, blockedTimeSlots, services, extras, appointments, onBook, logoUrl }) {
  const [step, setStep] = useState(1); 
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [isExtrasOpen, setIsExtrasOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });

  const toggleService = (s) => setSelectedServices(prev => prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  const toggleExtra = (e) => setSelectedExtras(prev => prev.find(x => x.id === e.id) ? prev.filter(x => x.id !== e.id) : [...prev, e]);
  
  const totalHours = selectedServices.reduce((sum, s) => sum + (Number(s.hours) || 1), 0);

  const getAvailableHoursForDate = (dateString) => {
    if (!dateString) return [];
    
    // סינון ימים חסומים לחלוטין
    if (blockedDates && blockedDates.includes(dateString)) return [];
    
    const dateObj = new Date(dateString);
    const hoursForDay = schedule[dateObj.getDay()] || [];
    const bookedHours = [];
    
    // תורים קיימים
    appointments.forEach(appt => {
      if (appt.date === dateString) {
        if (appt.blockedHours) bookedHours.push(...appt.blockedHours);
        else if (appt.time) bookedHours.push(appt.time);
      }
    });

    // שעות שחסומות ספציפית על ידי המנהלת לאותו יום
    if (blockedTimeSlots && blockedTimeSlots[dateString]) {
      bookedHours.push(...blockedTimeSlots[dateString]);
    }
    
    const freeHours = hoursForDay.filter(hour => !bookedHours.includes(hour));
    const validStartTimes = [];
    
    freeHours.forEach(startHour => {
      let isValid = true;
      const [baseH] = startHour.split(':').map(Number);
      for (let i = 0; i < totalHours; i++) {
        const checkHour = `${(baseH + i).toString().padStart(2, '0')}:00`;
        if (!freeHours.includes(checkHour)) { isValid = false; break; }
      }
      if (isValid) validStartTimes.push(startHour);
    });
    return validStartTimes;
  };

  const submitBooking = (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !formData.name || !formData.phone || selectedServices.length === 0) return;
    const blockedHours = [];
    const [baseH] = selectedTime.split(':').map(Number);
    for (let i = 0; i < totalHours; i++) { blockedHours.push(`${(baseH + i).toString().padStart(2, '0')}:00`); }
    onBook({ date: selectedDate, time: selectedTime, blockedHours, services: selectedServices, extras: selectedExtras, totalHours, ...formData });
    setStep(4);
  };

  const pad = n => n.toString().padStart(2, '0');
  const formatDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => {
    const today = new Date();
    if (currentMonth.getMonth() > today.getMonth() || currentMonth.getFullYear() > today.getFullYear()) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }
  };

  const renderCalendar = () => {
    const days = generateCalendarDays();
    const todayStr = formatDateStr(new Date());

    return (
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4 px-2">
          {/* חצים מתוקנים לעברית: ימינה = אחורה, שמאלה = קדימה */}
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ChevronRight size={20}/></button>
          <div className="font-bold text-lg text-gray-800">{MONTHS_HE[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ChevronLeft size={20}/></button>
        </div>
        
        <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center mb-2">
          {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
          
          {days.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="h-14"></div>;
            
            const dateStr = formatDateStr(date);
            const isPast = dateStr < todayStr;
            const isBlocked = blockedDates && blockedDates.includes(dateStr);
            const availHours = getAvailableHoursForDate(dateStr);
            const isFull = !isPast && !isBlocked && availHours.length === 0;
            const isClosedDay = !isPast && !isBlocked && (!schedule[date.getDay()] || schedule[date.getDay()].length === 0);
            
            const isSelectable = !isPast && !isBlocked && !isFull && !isClosedDay;
            const isSelected = selectedDate === dateStr;

            let cellClass = "flex flex-col items-center justify-center h-14 w-full rounded-2xl mx-auto transition-all relative ";
            let textClass = "font-bold text-base z-10 ";
            let subText = "";
            let subTextClass = "text-[10px] z-10 leading-none mt-0.5 ";

            if (isSelected) {
              // בחירה
              cellClass += "bg-pink-600 border-2 border-pink-600 shadow-md transform scale-105";
              textClass += "text-white";
              subText = "נבחר";
              subTextClass += "text-pink-100 font-medium";
            } else if (isPast || isClosedDay) {
              // ימים שעברו או סגורים קבוע
              cellClass += "opacity-40 cursor-not-allowed border border-transparent";
              textClass += "text-gray-400 font-normal";
            } else if (isBlocked || isFull) {
              // תפוס או חסום על ידי המנהלת
              cellClass += "bg-gray-700 border-2 border-gray-700";
              textClass += "text-white";
              subText = isBlocked ? "סגור" : "תפוס";
              subTextClass += "text-gray-300 font-medium";
            } else {
              // פנוי להזמנה
              cellClass += "bg-pink-50 border-2 border-pink-400 hover:bg-pink-100 cursor-pointer shadow-sm";
              textClass += "text-pink-800";
              subText = "פנוי";
              subTextClass += "text-pink-600 font-black";
            }

            return (
              <div key={dateStr} className="px-0.5">
                <button 
                  disabled={!isSelectable}
                  onClick={() => handleDateSelect(dateStr)}
                  className={cellClass}
                >
                  <span className={textClass}>{date.getDate()}</span>
                  {subText && <span className={subTextClass}>{subText}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const generateGoogleCalendarLink = () => {
    const d = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    d.setHours(parseInt(hours), parseInt(minutes), 0);
    const endD = new Date(d.getTime() + totalHours * 60 * 60 * 1000); 
    const formatForGcal = (date) => `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('תור לציפורניים אצל Lihi Nails 💅')}&dates=${formatForGcal(d)}/${formatForGcal(endD)}&details=${encodeURIComponent('זמן הפינוק שלך הגיע!')}`;
  };

  const handleDateSelect = (dateStr) => {
      setSelectedDate(dateStr);
      setSelectedTime('');
  };

  return (
    <div className="flex flex-col h-full bg-transparent pb-10">
      {step === 1 && (
        <div className="bg-gradient-to-r from-pink-600 to-pink-500 text-white p-6 pb-8 rounded-b-[40px] shadow-lg relative overflow-hidden border-b-[3px] border-pink-300">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-pink-400 rounded-full opacity-50 blur-2xl"></div>
          <div className="absolute bottom-[-30px] left-[-20px] w-24 h-24 bg-pink-400 rounded-full opacity-50 blur-xl"></div>
          <div className="relative z-10 text-center flex flex-col items-center">
            <img src={logoUrl} onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_LOGO_URL; }} alt="Lihi Nails" className="w-28 h-28 rounded-full border-4 border-white/40 shadow-xl mb-4 object-cover bg-white" />
            <h2 className="text-2xl font-bold mb-2 drop-shadow-md">ליהיא ניילס - מומחית ללק ג'ל 👑💅</h2>
            <p className="text-pink-50 text-sm leading-relaxed max-w-[280px] mx-auto font-medium text-center">שנים של ניסיון בתחום, הקפדה על הפרטים הקטנים ביותר ומאות לקוחות שכבר התמכרו. בואי להתפנק! 💖✨</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="px-5 mt-6 fade-in h-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Heart className="text-pink-500" size={20} /> איזה טיפולים תרצי היום?</h3>
          <div className="space-y-3 flex-1">
            {services.map(service => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              return (
                <button key={service.id} onClick={() => toggleService(service)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-pink-500 bg-pink-50 shadow-sm' : 'border-gray-200 bg-white hover:border-pink-300'}`}>
                  <span className={`font-bold ${isSelected ? 'text-pink-700' : 'text-gray-700'}`}>{service.label}</span>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'}`}>{isSelected && <CheckCircle size={16} />}</div>
                </button>
              );
            })}
            
            {extras && extras.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button onClick={() => setIsExtrasOpen(!isExtrasOpen)} className="w-full flex items-center justify-between bg-white/80 p-4 rounded-xl border border-gray-200 hover:bg-pink-50 transition-colors">
                  <div className="flex items-center gap-2 font-bold text-gray-800"><PlusCircle size={18} className="text-pink-500"/> תוספות לשדרוג</div>
                  {isExtrasOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </button>
                {isExtrasOpen && (
                  <div className="mt-3 space-y-2 animate-slide-up pl-2 pr-2">
                    {extras.map(extra => {
                      const isSelected = selectedExtras.some(e => e.id === extra.id);
                      return (
                        <button key={extra.id} onClick={() => toggleExtra(extra)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'border-pink-400 bg-pink-50 shadow-sm' : 'border-gray-100 bg-white hover:border-pink-200'}`}>
                          <span className={`font-medium text-sm text-right ${isSelected ? 'text-pink-700' : 'text-gray-600'}`}>{extra.label}</span>
                          <div className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center transition-colors mr-3 ${isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'}`}>{isSelected && <CheckCircle size={14} />}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedServices.length > 0 && (
            <div className="mt-8 mb-4 animate-slide-up">
              <div className="bg-pink-100 text-pink-800 p-3 rounded-xl mb-4 text-sm font-medium text-center">זמן הטיפול המשוער: {totalHours === 1 ? 'שעה 1' : `${totalHours} שעות`}</div>
              <button onClick={() => setStep(2)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2 shadow-lg hover:bg-gray-800 transition-colors">המשך לבחירת תאריך <ArrowRight size={20} /></button>
            </div>
          )}
          <div className="mt-8 mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center shadow-sm">
            <p className="text-xs text-rose-800 font-medium leading-relaxed">
              <strong>שימי לב:</strong> במידה ויש צורך לבטל או לשנות תור, יש לעשות זאת לפחות 24 שעות מראש. <br/>
              ביטול בפחות מ-24 שעות יחויב בדמי ביטול בסך 50% מעלות הטיפול. הזמן שלי יקר. 💖
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="px-5 mt-6 fade-in">
          <button onClick={() => setStep(1)} className="text-gray-500 mb-4 flex items-center gap-1 hover:text-pink-600 transition-colors w-fit"><ArrowRight size={16} /> חזרה לטיפולים</button>
          
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="text-pink-500" size={20} /> מתי נוח לך?</h3>
          
          {/* הלוח שנה החדש והמעודכן */}
          {renderCalendar()}

          {selectedDate && (
            <div className="mt-6 animate-slide-up bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="text-pink-500" size={18} /> בחרי שעה:</h3>
              <p className="text-xs text-gray-500 mb-3">מציג רק שעות פנויות עם מספיק זמן לטיפולים שבחרת.</p>
              <div className="grid grid-cols-3 gap-3">
                {getAvailableHoursForDate(selectedDate).map(hour => (
                  <button key={hour} onClick={() => setSelectedTime(hour)} className={`py-3 rounded-xl text-sm font-bold transition-all ${selectedTime === hour ? 'bg-pink-600 text-white shadow-md transform scale-105' : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-300'}`}>{hour}</button>
                ))}
              </div>
            </div>
          )}
          {selectedDate && selectedTime && (
            <div className="mt-8 animate-slide-up">
              <button onClick={() => setStep(3)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2 shadow-lg hover:bg-gray-800 transition-colors">המשך לפרטים <ArrowRight size={20} /></button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="p-6 fade-in h-full flex flex-col">
          <button onClick={() => setStep(2)} className="text-gray-500 mb-6 flex items-center gap-1 hover:text-pink-600 transition-colors w-fit"><ArrowRight size={16} /> חזרה ליומן</button>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">עוד צעד אחד קטן...</h2>
          <p className="text-gray-500 mb-6 text-sm">התור שלך שמור ל-{selectedDate.split('-').reverse().join('/')} בשעה {selectedTime}. רק נשאר למלא פרטים:</p>
          
          <div className="bg-pink-50 p-3 rounded-xl mb-6 text-sm text-pink-800 font-medium border border-pink-200">
            <div><strong>טיפולים:</strong> {selectedServices.map(s => s.label.split('-')[0].trim()).join(', ')}</div>
            {selectedExtras.length > 0 && <div className="mt-1 text-pink-700 text-xs"><strong>תוספות:</strong> {selectedExtras.map(e => e.label.split('-')[0].trim()).join(', ')}</div>}
          </div>

          <form onSubmit={submitBooking} className="space-y-5 flex-1 pb-4 text-right" dir="rtl">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">שם מלא <span className="text-red-500">*</span></label>
              {/* --- התיקון של השם: "איך קוראים לך?" בלבד --- */}
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none transition-all" placeholder="איך קוראים לך?" dir="rtl" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">טלפון <span className="text-red-500">*</span></label>
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl text-right focus:ring-2 focus:ring-pink-400 outline-none transition-all" placeholder="05X-XXXXXXX" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">הערות (לא חובה)</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl resize-none h-24 focus:ring-2 focus:ring-pink-400 outline-none transition-all" placeholder="נשברה ציפורן? בקשה מיוחדת?" dir="rtl" />
            </div>
            <button type="submit" className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg mt-4 shadow-lg hover:bg-pink-700 transition-colors">אשרי את התור! ✨</button>
          </form>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center fade-in bg-white/90">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-inner"><CheckCircle size={50} /></div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">איזה כיף! 🥳</h2>
          <p className="text-xl text-pink-600 font-bold mb-4">התור שלך נקבע בהצלחה 💅✨</p>
          
          <div className="bg-rose-50/90 rounded-2xl p-6 w-full mb-8 border border-rose-100 relative overflow-hidden shadow-sm">
             <div className="absolute -right-4 -top-4 text-pink-200 opacity-40"><Heart size={80} fill="currentColor" /></div>
             <p className="text-gray-700 relative z-10 leading-relaxed font-medium">
               היי {formData.name}, אני כבר מחכה לעשות לך ציפורניים מושלמות! 💖<br/><br/>
               <span className="font-bold text-gray-900 block mt-2 text-lg">
                 {selectedDate.split('-').reverse().join('/')} בשעה {selectedTime}
               </span>
             </p>
          </div>
          
          <div className="w-full space-y-3 mb-6 mt-4">
            <a href={generateGoogleCalendarLink()} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-blue-700 transition-colors"><CalendarPlus size={24} /> הוספה ל-Google Calendar</a>
          </div>
          <button onClick={() => { setStep(1); setSelectedServices([]); setSelectedExtras([]); setSelectedDate(''); setSelectedTime(''); setFormData({ name: '', phone: '', notes: '' }); }} className="mt-8 text-gray-500 font-medium underline hover:text-pink-600 transition-colors">חזרה לדף הראשי</button>
        </div>
      )}
    </div>
  );
}

// ==========================================
//              צד מנהלת (Admin View)
// ==========================================
function AdminView({ schedule, blockedDates, blockedTimeSlots, services, extras, appointments, logoUrl, whatsappTemplate, onUpdateSetting, onDeleteAppointment, onUpdateAppointment }) {
  const [activeTab, setActiveTab] = useState('appointments');
  const [lastCheckedNotes, setLastCheckedNotes] = useState(() => parseInt(localStorage.getItem('lihi_last_notif')) || Date.now());
  const tabsRef = useRef(null);

  const newApptsCount = appointments.filter(a => a.createdAt && a.createdAt > lastCheckedNotes).length;

  const handleTabClick = (tab) => {
    if (tab === 'appointments') {
      setLastCheckedNotes(Date.now());
      localStorage.setItem('lihi_last_notif', Date.now().toString());
    }
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-gray-900 text-white p-5 rounded-b-3xl shadow-lg flex justify-between items-center">
        <button onClick={() => handleTabClick('appointments')} className="relative p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
          <Bell size={20} className="text-pink-400" />
          {newApptsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-md">
              {newApptsCount}
            </span>
          )}
        </button>
        <h2 className="text-2xl font-bold mb-1">לוח בקרה 👑</h2>
      </div>

      <div className="flex items-center px-2 mt-6 gap-1 w-full">
        <button onClick={() => tabsRef.current?.scrollBy({left: 200, behavior:'smooth'})} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-pink-50 shadow-sm flex-shrink-0 text-gray-600 z-10">
          <ChevronRight size={18} />
        </button>
        
        <div ref={tabsRef} className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 flex-nowrap flex-1 scroll-smooth" dir="rtl" style={{ WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => handleTabClick('appointments')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all whitespace-nowrap ${activeTab === 'appointments' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
            <Calendar size={16} /> תורים
          </button>
          <button onClick={() => handleTabClick('analytics')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all whitespace-nowrap ${activeTab === 'analytics' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
            <BarChart3 size={16} /> הכנסות
          </button>
          <button onClick={() => handleTabClick('menu')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all whitespace-nowrap ${activeTab === 'menu' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
            <PlusCircle size={16} /> טיפולים
          </button>
          <button onClick={() => handleTabClick('broadcast')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all whitespace-nowrap ${activeTab === 'broadcast' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
            <Megaphone size={16} /> תפוצה
          </button>
          <button onClick={() => handleTabClick('settings')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
            <Settings size={16} /> הגדרות
          </button>
        </div>

        <button onClick={() => tabsRef.current?.scrollBy({left: -200, behavior:'smooth'})} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-pink-50 shadow-sm flex-shrink-0 text-gray-600 z-10">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto" dir="rtl">
        {activeTab === 'appointments' && <AdminAppointmentsList appointments={appointments} onDeleteAppointment={onDeleteAppointment} onUpdateAppointment={onUpdateAppointment} whatsappTemplate={whatsappTemplate} />}
        {activeTab === 'analytics' && <AdminAnalytics appointments={appointments} />}
        {activeTab === 'menu' && <AdminMenuManager services={services} extras={extras} onUpdateSetting={onUpdateSetting} />}
        {activeTab === 'broadcast' && <AdminBroadcast appointments={appointments} />}
        {activeTab === 'settings' && <AdminScheduleSettings schedule={schedule} blockedDates={blockedDates} blockedTimeSlots={blockedTimeSlots} logoUrl={logoUrl} whatsappTemplate={whatsappTemplate} onUpdateSetting={onUpdateSetting} />}
      </div>
    </div>
  );
}

function AdminAppointmentsList({ appointments, onDeleteAppointment, onUpdateAppointment, whatsappTemplate }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  const sortedAppointments = [...appointments].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  
  const groupedAppts = sortedAppointments.reduce((groups, appt) => {
    const dateStr = appt.date || 'ללא תאריך';
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(appt);
    return groups;
  }, {});

  const sendWhatsAppConfirmation = (appt) => {
    let cleanPhone = appt.phone ? appt.phone.replace(/\D/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = '972' + cleanPhone.substring(1);
    const servicesText = appt.services ? appt.services.map(s => s.label.split('-')[0].trim()).join(', ') : '';
    const formattedDate = appt.date ? appt.date.split('-').reverse().join('/') : '';
    let message = whatsappTemplate.replace(/\[שם_לקוחה\]/g, appt.name || '').replace(/\[תאריך\]/g, formattedDate).replace(/\[שעה\]/g, appt.time || '').replace(/\[טיפולים\]/g, servicesText);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEditClick = (appt) => {
    setEditingId(appt.id);
    setEditData({ ...appt, services: appt.services || [], extras: appt.extras || [] });
  };

  const handleSaveEdit = () => {
    const totalH = editData.services.reduce((sum, s) => sum + (Number(s.hours) || 1), 0);
    const blockedHours = [];
    if (editData.time) {
      const [baseH] = editData.time.split(':').map(Number);
      for (let i = 0; i < totalH; i++) blockedHours.push(`${(baseH + i).toString().padStart(2, '0')}:00`);
    }
    onUpdateAppointment(editingId, { ...editData, totalHours: totalH, blockedHours });
    setEditingId(null); setEditData(null);
  };

  if (appointments.length === 0) {
    return <div className="text-center py-16 text-gray-400"><Calendar size={48} className="mx-auto mb-4 opacity-50" /><p>אין תורים קבועים עדיין.</p></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {Object.keys(groupedAppts).map(dateStr => {
        const dateObj = new Date(dateStr);
        const dayName = isNaN(dateObj) ? '' : DAYS_OF_WEEK[dateObj.getDay()];
        const formattedDate = dateStr.includes('-') ? dateStr.split('-').reverse().join('/') : dateStr;
        
        return (
          <div key={dateStr}>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 bg-pink-100 px-4 py-2 rounded-xl text-pink-800 shadow-sm border border-pink-200">
              <Calendar size={18} /> יום {dayName}, {formattedDate}
            </h3>
            
            <div className="space-y-3">
              {groupedAppts[dateStr].map(appt => {
                const isNew = appt.createdAt && (Date.now() - appt.createdAt < 24 * 60 * 60 * 1000); 
                
                if (editingId === appt.id) {
                  return (
                    <div key={appt.id} className="bg-pink-50 p-4 rounded-2xl shadow-sm border border-pink-300">
                      <div className="space-y-3 mb-4">
                        <input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="שם" />
                        <input type="tel" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="טלפון" dir="ltr" />
                        <div className="flex gap-2">
                          <input type="date" value={editData.date || ''} onChange={e => setEditData({...editData, date: e.target.value})} className="flex-1 p-2 border rounded-lg text-sm" />
                          <input type="time" value={editData.time || ''} onChange={e => setEditData({...editData, time: e.target.value})} className="flex-1 p-2 border rounded-lg text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors">ביטול</button>
                        <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition-colors shadow-sm">שמור</button>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={appt.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${isNew ? 'border-pink-400 bg-pink-50/30' : 'border-gray-100'} flex justify-between items-start relative text-right`} dir="rtl">
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-pink-500 rounded-r-2xl"></div>
                    <div className="pr-2 w-full">
                      <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {appt.time} - {appt.name}
                        {isNew && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-normal animate-pulse">חדש!</span>}
                      </div>
                      <div className="text-xs mt-1 font-semibold text-pink-600 bg-pink-100 inline-block px-2 py-1 rounded">
                        {(appt.services || []).map(s => s.label.split('-')[0].trim()).join(' + ')}
                      </div>
                      <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                        📞 <a href={`tel:${appt.phone}`} className="hover:underline" dir="ltr">{appt.phone}</a>
                      </div>
                      {appt.notes && <div className="mt-2 text-xs text-gray-600 bg-orange-50 border border-orange-100 p-2 rounded-lg"><span className="font-bold">הערות:</span> {appt.notes}</div>}
                    </div>
                    <div className="flex flex-col gap-2 pl-2 border-r border-gray-100 pr-3">
                      <button onClick={() => sendWhatsAppConfirmation(appt)} className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366]/20 transition-colors shadow-sm"><MessageCircle size={16} /></button>
                      <button onClick={() => handleEditClick(appt)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors shadow-sm"><Edit2 size={16} /></button>
                      <button onClick={() => { if(window.confirm('למחוק תור זה?')) onDeleteAppointment(appt.id); }} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm"><X size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminAnalytics({ appointments }) {
  const getApptPrice = (appt) => {
    let total = 0;
    const items = [...(appt.services || []), ...(appt.extras || [])];
    items.forEach(item => {
      if (item.price) { total += Number(item.price); } 
      else {
        const match = item.label ? item.label.match(/(\d+)\s*₪/) : null;
        if (match) total += parseInt(match[1]);
      }
    });
    return total;
  };

  const monthlyData = {};
  let totalYearlyIncome = 0;
  
  appointments.forEach(appt => {
    if (!appt.date) return;
    const [year, month] = appt.date.split('-'); 
    const monthKey = `${month}/${year.substring(2)}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { name: monthKey, income: 0, count: 0 };
    }
    
    const price = getApptPrice(appt);
    monthlyData[monthKey].income += price;
    monthlyData[monthKey].count += 1;
    totalYearlyIncome += price;
  });

  const chartData = Object.values(monthlyData).sort((a, b) => {
    const [m1, y1] = a.name.split('/');
    const [m2, y2] = b.name.split('/');
    return new Date(`20${y1}-${m1}-01`) - new Date(`20${y2}-${m2}-01`);
  });

  return (
    <div className="pb-10 animate-fade-in text-right">
      <div className="bg-gradient-to-br from-pink-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg mb-6">
        <h3 className="text-sm font-medium opacity-90 mb-1">סה"כ הכנסות מתורים באפליקציה</h3>
        <div className="text-4xl font-black mb-2" dir="ltr">₪{totalYearlyIncome.toLocaleString()}</div>
        <div className="text-sm flex items-center gap-1 opacity-90 justify-end"><TrendingUp size={16}/> סטטיסטיקה מחושבת אוטומטית</div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-800 mb-4 text-center">הכנסות לפי חודשים</h3>
        {chartData.length > 0 ? (
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <Tooltip cursor={{fill: '#fce7f3'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="income" name="הכנסה (₪)" fill="#db2777" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">אין מספיק נתונים להצגת גרף</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {chartData.map(data => (
          <div key={data.name} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-xs text-gray-500 font-bold mb-1">חודש {data.name}</div>
            <div className="text-lg font-black text-pink-600" dir="ltr">₪{data.income.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">{data.count} תורים החודש</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminMenuManager({ services, extras, onUpdateSetting }) {
  const [newService, setNewService] = useState({ label: '', price: '', hours: 1 });
  const [newExtra, setNewExtra] = useState({ label: '', price: '' });

  const handleAddService = () => {
    if (!newService.label || !newService.price) return;
    const s = { 
      id: Date.now().toString(), 
      label: `${newService.label} - ${newService.price} ₪`, 
      price: Number(newService.price), 
      hours: Number(newService.hours) 
    };
    onUpdateSetting('services', [...(services || []), s]);
    setNewService({ label: '', price: '', hours: 1 });
  };

  const handleDeleteService = (id) => {
    if(window.confirm('למחוק טיפול זה?')) {
      onUpdateSetting('services', (services || []).filter(s => s.id !== id));
    }
  };

  const handleAddExtra = () => {
    if (!newExtra.label || !newExtra.price) return;
    const e = { 
      id: Date.now().toString(), 
      label: `${newExtra.label} - ${newExtra.price} ₪`, 
      price: Number(newExtra.price) 
    };
    onUpdateSetting('extras', [...(extras || []), e]);
    setNewExtra({ label: '', price: '' });
  };

  const handleDeleteExtra = (id) => {
    if(window.confirm('למחוק תוספת זו?')) {
      onUpdateSetting('extras', (extras || []).filter(e => e.id !== id));
    }
  };

  return (
    <div className="pb-10">
      {/* ניהול טיפולים מרכזיים */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Star className="text-pink-500" size={18}/> ניהול טיפולים</h3>
        
        <div className="space-y-2 mb-4">
          {(services || []).map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <div className="font-bold text-sm">{s.label.split('-')[0].trim()}</div>
                <div className="text-xs text-gray-500">₪{s.price} | {s.hours} שעות</div>
              </div>
              <button onClick={() => handleDeleteService(s.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>

        <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 space-y-3">
          <h4 className="text-xs font-bold text-pink-800">הוספת טיפול חדש</h4>
          <input type="text" placeholder="שם הטיפול (למשל: בנייה בג'ל)" value={newService.label} onChange={e => setNewService({...newService, label: e.target.value})} className="w-full p-2 rounded-lg text-sm border-gray-200 outline-none focus:ring-1 focus:ring-pink-400" />
          <div className="flex gap-2">
            <input type="number" placeholder="מחיר (₪)" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-1/2 p-2 rounded-lg text-sm border-gray-200 outline-none focus:ring-1 focus:ring-pink-400" />
            <select value={newService.hours} onChange={e => setNewService({...newService, hours: e.target.value})} className="w-1/2 p-2 rounded-lg text-sm border-gray-200 outline-none focus:ring-1 focus:ring-pink-400 bg-white">
              <option value={1}>זמן: 1 שעה</option>
              <option value={2}>זמן: 2 שעות</option>
              <option value={3}>זמן: 3 שעות</option>
            </select>
          </div>
          <button onClick={handleAddService} className="w-full bg-pink-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 hover:bg-pink-700"><Plus size={16}/> הוסף לתפריט</button>
        </div>
      </div>

      {/* ניהול תוספות */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PlusCircle className="text-blue-500" size={18}/> ניהול תוספות</h3>
        
        <div className="space-y-2 mb-4">
          {(extras || []).map(e => (
            <div key={e.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <div className="font-bold text-sm">{e.label.split('-')[0].trim()}</div>
                <div className="text-xs text-gray-500">₪{e.price}</div>
              </div>
              <button onClick={() => handleDeleteExtra(e.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
          <h4 className="text-xs font-bold text-blue-800">הוספת תוספת חדשה</h4>
          <input type="text" placeholder="שם התוספת (למשל: קישוט בודד)" value={newExtra.label} onChange={e => setNewExtra({...newExtra, label: e.target.value})} className="w-full p-2 rounded-lg text-sm border-gray-200 outline-none focus:ring-1 focus:ring-blue-400" />
          <input type="number" placeholder="מחיר (₪)" value={newExtra.price} onChange={e => setNewExtra({...newExtra, price: e.target.value})} className="w-full p-2 rounded-lg text-sm border-gray-200 outline-none focus:ring-1 focus:ring-blue-400" />
          <button onClick={handleAddExtra} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 hover:bg-blue-700"><Plus size={16}/> הוסף תוספת</button>
        </div>
      </div>
    </div>
  );
}

function AdminBroadcast({ appointments }) {
  const [copied, setCopied] = useState(false);

  const uniqueNumbers = [...new Set(appointments
    .map(a => a.phone ? a.phone.replace(/\D/g, '') : '')
    .filter(p => p.length >= 9)
    .map(p => p.startsWith('0') ? '972' + p.substring(1) : p)
  )];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(uniqueNumbers.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="pb-10 animate-fade-in text-right">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><Megaphone size={32} /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">שליחת הודעת תפוצה בווצאפ</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6" dir="rtl">
          ווצאפ לא מאפשרת לשלוח הודעות להמון אנשים בבת אחת כדי למנוע ספאם. 
          כדי לשלוח הודעה לכל הלקוחות שלך, עליך לפתוח <strong>"רשימת תפוצה" (Broadcast)</strong> באפליקציית הווצאפ שלך, ולהדביק לשם את כל המספרים.
        </p>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
          <div className="text-4xl font-black text-gray-800 mb-1">{uniqueNumbers.length}</div>
          <div className="text-xs font-bold text-gray-500">מספרים של לקוחות שמורים במערכת</div>
        </div>

        <button 
          onClick={copyToClipboard}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-500 text-white shadow-md' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'}`}
        >
          {copied ? <><Check size={20}/> המספרים הועתקו!</> : <><Copy size={20}/> העתיקי את כל המספרים</>}
        </button>
      </div>

      <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 text-yellow-800 text-sm text-right">
        <strong className="block mb-2">איך עושים את זה?</strong>
        <ol className="list-decimal list-inside space-y-1">
          <li>לחצי על הכפתור למעלה להעתקת המספרים.</li>
          <li>כנסי לווצאפ, לחצי על 3 הנקודות ובחרי "רשימת תפוצה חדשה".</li>
          <li>הדביקי את המספרים בתיבת החיפוש והוסיפי אותם.</li>
          <li>שלחי את ההודעה הרצויה לכולן בבת אחת! 💬</li>
        </ol>
      </div>
    </div>
  );
}

function AdminScheduleSettings({ schedule, blockedDates, blockedTimeSlots, logoUrl, whatsappTemplate, onUpdateSetting }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [dateToBlock, setDateToBlock] = useState('');
  const [endDateToBlock, setEndDateToBlock] = useState('');
  const daysRef = useRef(null);

  const toggleHour = (hour) => {
    const currentHours = schedule[selectedDay] || [];
    const newHours = currentHours.includes(hour) ? currentHours.filter(h => h !== hour) : [...currentHours, hour].sort();
    onUpdateSetting('schedule', { ...schedule, [selectedDay]: newHours });
  };

  const handleBlockFullDate = () => {
    if (!dateToBlock) return;

    const pad = n => n.toString().padStart(2, '0');
    const formatDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const newBlocked = [...(blockedDates || [])];
    let start = new Date(dateToBlock);
    let end = endDateToBlock ? new Date(endDateToBlock) : new Date(dateToBlock);

    if (end < start) {
      let temp = start;
      start = end;
      end = temp;
    }

    let current = new Date(start);
    while (current <= end) {
      const dateStr = formatDateStr(current);
      if (!newBlocked.includes(dateStr)) {
        newBlocked.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    onUpdateSetting('blockedDates', newBlocked);
    setDateToBlock('');
    setEndDateToBlock('');
  };

  const toggleSpecificHour = (dateStr, hour) => {
    const currentSlots = blockedTimeSlots || {};
    const daySlots = currentSlots[dateStr] || [];
    let newDaySlots;
    if (daySlots.includes(hour)) {
      newDaySlots = daySlots.filter(h => h !== hour);
    } else {
      newDaySlots = [...daySlots, hour];
    }

    const newBlockedSlots = { ...currentSlots };
    if (newDaySlots.length === 0) {
      delete newBlockedSlots[dateStr];
    } else {
      newBlockedSlots[dateStr] = newDaySlots;
    }
    onUpdateSetting('blockedTimeSlots', newBlockedSlots);
  };

  const handleUnblockDate = (dateStr) => {
    onUpdateSetting('blockedDates', (blockedDates || []).filter(d => d !== dateStr));
  };

  const handleUnblockSpecificHours = (dateStr) => {
    const newSlots = {...(blockedTimeSlots || {})};
    delete newSlots[dateStr];
    onUpdateSetting('blockedTimeSlots', newSlots);
  };

  return (
    <div className="pb-10 text-right" dir="rtl">
      
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarOff className="text-red-500" size={18}/> חסימת ימים ושעות ספציפיות</h3>
        <p className="text-xs text-gray-500 mb-4">בחרי טווח תאריכים לחופשה (או תאריך יחיד), או לחצי על שעות מסוימות כדי לחסום אותן נקודתית.</p>
        
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 mb-1 block">מתאריך:</label>
            <input type="date" value={dateToBlock} onChange={e => setDateToBlock(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none focus:border-red-400" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 mb-1 block">עד תאריך (אופציונלי):</label>
            <input type="date" value={endDateToBlock} onChange={e => setEndDateToBlock(e.target.value)} min={dateToBlock} className="w-full p-2 border rounded-lg text-sm outline-none focus:border-red-400" />
          </div>
        </div>
        
        {dateToBlock && (
          <div className="space-y-4 animate-fade-in border-t border-gray-100 pt-4">
            <button onClick={handleBlockFullDate} className="w-full bg-red-500 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-red-600 shadow-sm transition-colors">
              {endDateToBlock && endDateToBlock !== dateToBlock ? 'חסמי את כל התאריכים בטווח' : 'חסמי את כל יום זה'}
            </button>

            {(!endDateToBlock || endDateToBlock === dateToBlock) && (
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2">או חסמי רק שעות ספציפיות ביום זה:</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(schedule[new Date(dateToBlock).getDay()] || []).map(hour => {
                    const isBlocked = blockedTimeSlots?.[dateToBlock]?.includes(hour);
                    return (
                      <button key={hour} onClick={() => toggleSpecificHour(dateToBlock, hour)} className={`py-2 rounded-lg text-sm font-bold border-2 transition-colors ${isBlocked ? 'bg-red-50 border-red-500 text-red-700 shadow-inner' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}>
                        {hour}
                      </button>
                    );
                  })}
                </div>
                {(schedule[new Date(dateToBlock).getDay()] || []).length === 0 && (
                  <p className="text-xs text-gray-500 text-center mt-2">העסק לא עובד ביום זה לפי ההגדרות השבועיות.</p>
                )}
              </div>
            )}
          </div>
        )}

        {((blockedDates && blockedDates.length > 0) || (blockedTimeSlots && Object.keys(blockedTimeSlots).length > 0)) && (
          <div className="space-y-2 border-t border-gray-100 pt-4 mt-4">
            <h4 className="text-xs font-bold text-gray-600 mb-2">חסימות פעילות במערכת:</h4>
            
            {[...(blockedDates || [])].sort().map(d => (
              <div key={`full-${d}`} className="flex justify-between items-center p-2 bg-red-50 rounded-lg text-sm border border-red-100">
                <span className="font-bold text-red-700">{d.split('-').reverse().join('/')} - חסום יום שלם</span>
                <button onClick={() => handleUnblockDate(d)} className="text-red-500 hover:text-red-700 text-xs font-bold underline">שחרר חסימה</button>
              </div>
            ))}

            {Object.entries(blockedTimeSlots || {}).sort(([a], [b]) => a.localeCompare(b)).map(([dStr, hours]) => (
              <div key={`part-${dStr}`} className="flex justify-between items-center p-2 bg-orange-50 rounded-lg text-sm border border-orange-100">
                <div>
                  <span className="font-bold text-orange-700">{dStr.split('-').reverse().join('/')}</span><br/>
                  <span className="text-xs text-orange-600">שעות חסומות: {hours.join(', ')}</span>
                </div>
                <button onClick={() => handleUnblockSpecificHours(dStr)} className="text-orange-500 hover:text-orange-700 text-xs font-bold underline">שחרר הכל</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="font-bold text-gray-800 mb-3 px-1">שעות עבודה קבועות לפי יום:</h3>
      
      <div className="flex items-center gap-1 mb-2">
        <button onClick={() => daysRef.current?.scrollBy({left: 200, behavior:'smooth'})} className="p-1.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex-shrink-0 text-gray-600 shadow-sm z-10"><ChevronRight size={16}/></button>
        
        <div ref={daysRef} className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar scroll-smooth flex-1" dir="rtl">
          {DAYS_OF_WEEK.map((dayName, index) => index !== 6 && ( 
            <button key={index} onClick={() => setSelectedDay(index)} className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all ${selectedDay === index ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border'}`}>{dayName}</button>
          ))}
        </div>

        <button onClick={() => daysRef.current?.scrollBy({left: -200, behavior:'smooth'})} className="p-1.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex-shrink-0 text-gray-600 shadow-sm z-10"><ChevronLeft size={16}/></button>
      </div>

      <div className="mt-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold mb-4 text-gray-800">שעות פתוחות - יום {DAYS_OF_WEEK[selectedDay]}</h3>
        <div className="grid grid-cols-3 gap-3">
          {ALL_POSSIBLE_HOURS.map(hour => (
            <button key={hour} onClick={() => toggleHour(hour)} className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${schedule[selectedDay]?.includes(hour) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'}`}>{hour}</button>
          ))}
        </div>
      </div>
      
      <div className="mt-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold mb-4 text-gray-800">לוגו האתר (URL) 🖼️</h3>
        <input type="text" value={logoUrl} onChange={(e) => onUpdateSetting('logoUrl', e.target.value)} className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-pink-400 outline-none" dir="ltr" placeholder="הדביקי לינק לתמונה" />
      </div>
      <div className="mt-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold mb-4 text-gray-800">תבנית הודעת ווצאפ 💬</h3>
        <textarea value={whatsappTemplate} onChange={(e) => onUpdateSetting('whatsappTemplate', e.target.value)} className="w-full p-3 border rounded-xl text-sm h-48 resize-none focus:ring-2 focus:ring-pink-400 outline-none" dir="rtl" />
        <p className="text-[10px] text-gray-400 mt-2">ניתן להשתמש ב: [שם_לקוחה], [תאריך], [שעה], [טיפולים]</p>
      </div>
    </div>
  );
}
