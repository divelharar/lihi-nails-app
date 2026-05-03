import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Heart, CheckCircle, Settings, User, ArrowRight, CalendarPlus, X, Menu, ChevronLeft, ChevronRight, Edit2, ChevronDown, ChevronUp, PlusCircle, MessageCircle, AlertCircle, Bell, BarChart3, Megaphone, Copy, Check } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// --- החיבור שלך ל-Firebase ---
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

const DEFAULT_SCHEDULE = {
  0: ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00'],
  1: ['17:00', '18:00', '19:00'],
  2: ['09:00', '10:00', '11:00', '12:00', '13:00'],
  3: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00'],
  4: ['09:00', '10:00', '11:00', '12:00', '13:00'],
  5: ['09:00', '10:00', '11:00', '12:00'],
  6: []
};

const ALL_POSSIBLE_HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const AVAILABLE_SERVICES = [
  { id: 'gel_anatomy', label: 'לק ג\'ל אנטומי - 150 ₪', hours: 1, price: 150 },
  { id: 'gel_refill', label: 'מילוי בג\'ל בנייה - 160 ₪', hours: 1, price: 160 },
  { id: 'gel_feet', label: 'לק ג\'ל רגליים - 130 ₪', hours: 1, price: 130 },
  { id: 'new_build', label: 'בנייה חדשה - 300 ₪', hours: 2, price: 300 } 
];

const AVAILABLE_EXTRAS = [
  { id: 'extra_nail', label: '⭐ השלמת ציפורן - 10 ₪', price: 10 },
  { id: 'extra_art', label: '🎨 קישוטים בסיסיים - 10 ₪', price: 10 },
  { id: 'extra_fix', label: '🛠️ תיקון ציפורן - 20 ₪', price: 20 }
];

const DEFAULT_WHATSAPP_TEMPLATE = `היי [שם_לקוחה] המהממת! 🌸
רציתי לאשר את התור שלך אצל ליהיא ניילס (Lihi Nails):
🗓️ תאריך: [תאריך] | 🕒 שעה: [שעה]
💅 טיפולים: [טיפולים]
📍 ח"ן 1, אשקלון. מחכה לך! 💖`;

function LihiNailsApp() {
  const [view, setView] = useState('customer');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=400&auto=format&fit=crop');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (!auth) { setIsLoading(false); return; }
    const initAuth = async () => {
      try { await signInAnonymously(auth); } 
      catch (err) { if (err.code === 'auth/configuration-not-found') { setAuthError(true); setUser({ uid: 'guest-user' }); } }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, u => {
      if (u) setUser(u);
      else setTimeout(() => { if (!user) setUser({ uid: 'temp' }); }, 2000);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsubAppts = onSnapshot(collection(db, 'appointments'), snap => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, err => { console.error(err); setIsLoading(false); });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), docSnap => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.schedule) setSchedule(d.schedule);
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.whatsappTemplate) setWhatsappTemplate(d.whatsappTemplate);
      }
    });
    return () => { unsubAppts(); unsubSettings(); };
  }, [user]);

  const handleAddAppointment = async (newAppt) => {
    if (!db) return;
    try { await addDoc(collection(db, 'appointments'), { ...newAppt, createdAt: Date.now() }); } catch(e) { console.error(e); }
  };

  const handleUpdateAppointment = async (id, updatedData) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'appointments', id), updatedData); } catch(e) { console.error(e); }
  };

  const handleDeleteAppointment = async (id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'appointments', id)); } catch(e) { console.error(e); }
  };

  const handleUpdateSetting = async (field, value) => {
    if (!db) return;
    try { await setDoc(doc(db, 'settings', 'main'), { [field]: value }, { merge: true }); } catch(e) { console.error(e); }
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center font-sans" dir="rtl">
        <div className="animate-bounce mb-4 text-pink-500"><Heart size={48} fill="currentColor" /></div>
        <h2 className="text-xl font-bold text-gray-800">טוען את המערכת... 💅</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-right bg-cover bg-center bg-fixed relative" dir="rtl" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop')" }}>
      <div className="absolute inset-0 bg-rose-50/85 backdrop-blur-sm"></div>
      <div className="relative z-10">
        <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-20">
          <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt="לוגו Lihi Nails" className="w-12 h-12 rounded-full object-cover border-2 border-pink-200 shadow-sm bg-white" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Lihi Nails 💅✨</h1>
                <p className="text-xs text-pink-600 font-bold">האומנות שלי, הציפורניים שלך 💎</p>
              </div>
            </div>
            <button 
              onClick={() => {
                if (view === 'customer') { isAdminAuthenticated ? setView('admin') : setView('auth'); } 
                else { setView('customer'); }
              }}
              className="p-2 text-gray-400 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-50"
            >
              {view === 'customer' ? <Settings size={20} /> : <User size={20} />}
            </button>
          </div>
        </header>

        {authError && isAdminAuthenticated && (
          <div className="max-w-md mx-auto mt-4 px-4">
             <div className="bg-amber-100 border border-amber-300 p-3 rounded-xl flex gap-3 text-amber-800 text-xs shadow-md">
                <AlertCircle size={20} className="shrink-0" />
                <p><strong>הודעת מערכת:</strong> התחברות Anonymous לא מופעלת. הנתונים לא נשמרים בענן.</p>
             </div>
          </div>
        )}

        <main className="max-w-md mx-auto min-h-[calc(100vh-80px)] bg-white/95 backdrop-blur-md shadow-2xl sm:rounded-b-3xl overflow-hidden relative border-x border-b border-white/50">
          {view === 'customer' && <CustomerView schedule={schedule} appointments={appointments} onBook={handleAddAppointment} logoUrl={logoUrl} />}
          {view === 'auth' && (
            <div className="p-8 flex flex-col items-center justify-center h-full min-h-[60vh] text-center fade-in bg-white/90">
              <img src={logoUrl} alt="לוגו" className="w-24 h-24 rounded-full border-4 border-pink-100 shadow-md mb-6 object-cover bg-white" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">כניסת מנהלת 👑</h2>
              <div className="w-full max-w-[250px] mt-6">
                <input 
                  type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className={`text-center text-3xl tracking-[0.5em] w-full p-4 bg-gray-50 border-2 ${pinError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-pink-400'} rounded-2xl outline-none mb-2`}
                  placeholder="****" maxLength={4} dir="ltr"
                />
                <div className="h-6 mb-4">{pinError && <p className="text-red-500 text-xs font-bold animate-pulse">קוד שגוי, נסי שוב.</p>}</div>
                <button onClick={handleAdminLogin} className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-pink-700 shadow-lg mb-4">כניסה</button>
                <button onClick={() => { setView('customer'); setPin(''); setPinError(false); }} className="text-gray-500 font-medium hover:text-pink-600 underline text-sm w-full">חזרה</button>
              </div>
            </div>
          )}
          {view === 'admin' && <AdminView schedule={schedule} appointments={appointments} logoUrl={logoUrl} whatsappTemplate={whatsappTemplate} onUpdateSetting={handleUpdateSetting} onDeleteAppointment={handleDeleteAppointment} onUpdateAppointment={handleUpdateAppointment} />}
        </main>
      </div>
    </div>
  );
}

function CustomerView({ schedule, appointments, onBook, logoUrl }) {
  const [step, setStep] = useState(1); 
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [isExtrasOpen, setIsExtrasOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const dateContainerRef = useRef(null);

  const toggleService = (s) => setSelectedServices(prev => prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  const toggleExtra = (e) => setSelectedExtras(prev => prev.find(x => x.id === e.id) ? prev.filter(x => x.id !== e.id) : [...prev, e]);
  const totalHours = selectedServices.reduce((sum, s) => sum + s.hours, 0);

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      if (d.getDay() !== 6) days.push(d);
    }
    return days;
  };

  const getAvailableHoursForDate = (dateString) => {
    if (!dateString) return [];
    const dateObj = new Date(dateString);
    const hoursForDay = schedule[dateObj.getDay()] || [];
    const bookedHours = [];
    appointments.forEach(appt => {
      if (appt.date === dateString) {
        if (appt.blockedHours) bookedHours.push(...appt.blockedHours);
        else if (appt.time) bookedHours.push(appt.time);
      }
    });
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

  return (
    <div className="flex flex-col h-full bg-transparent pb-10">
      {step === 1 && (
        <div className="bg-gradient-to-r from-pink-600 to-pink-500 text-white p-6 pb-8 rounded-b-[40px] shadow-lg relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-pink-400 rounded-full opacity-50 blur-2xl"></div>
          <div className="relative z-10 text-center flex flex-col items-center">
            <img src={logoUrl} alt="Lihi Nails" className="w-24 h-24 rounded-full border-4 border-white/40 shadow-xl mb-4 object-cover bg-white" />
            <h2 className="text-2xl font-bold mb-2">ליהיא ניילס - מומחית ללק ג'ל 👑💅</h2>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="px-5 mt-6 fade-in h-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Heart className="text-pink-500" size={20} /> איזה טיפולים תרצי היום?</h3>
          <div className="space-y-3 flex-1">
            {AVAILABLE_SERVICES.map(service => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              return (
                <button key={service.id} onClick={() => toggleService(service)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'}`}>
                  <span className={`font-bold ${isSelected ? 'text-pink-700' : 'text-gray-700'}`}>{service.label}</span>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'}`}>{isSelected && <CheckCircle size={16} />}</div>
                </button>
              );
            })}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => setIsExtrasOpen(!isExtrasOpen)} className="w-full flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 font-bold text-gray-800"><PlusCircle size={18} className="text-pink-500"/> תוספות לשדרוג</div>
                {isExtrasOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
              </button>
              {isExtrasOpen && (
                <div className="mt-3 space-y-2">
                  {AVAILABLE_EXTRAS.map(extra => {
                    const isSelected = selectedExtras.some(e => e.id === extra.id);
                    return (
                      <button key={extra.id} onClick={() => toggleExtra(extra)} className={`w-full flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'border-pink-400 bg-pink-50' : 'border-gray-100 bg-white'}`}>
                        <span className={`font-medium text-sm ${isSelected ? 'text-pink-700' : 'text-gray-600'}`}>{extra.label}</span>
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'}`}>{isSelected && <CheckCircle size={14} />}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {selectedServices.length > 0 && (
            <div className="mt-8 animate-slide-up">
              <button onClick={() => setStep(2)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2">המשך לתאריך <ArrowRight size={20} /></button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="px-5 mt-6 fade-in">
          <button onClick={() => setStep(1)} className="text-gray-500 mb-4 flex items-center gap-1"><ArrowRight size={16} /> חזרה</button>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="text-pink-500" size={20} /> מתי נוח לך?</h3>
            <div className="flex gap-2">
              <button onClick={() => dateContainerRef.current.scrollBy({left:-200, behavior:'smooth'})} className="p-1.5 bg-white border border-gray-200 rounded-full"><ChevronRight size={18} /></button>
              <button onClick={() => dateContainerRef.current.scrollBy({left:200, behavior:'smooth'})} className="p-1.5 bg-white border border-gray-200 rounded-full"><ChevronLeft size={18} /></button>
            </div>
          </div>
          <div ref={dateContainerRef} className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar snap-x scroll-smooth">
            {getNextDays().map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              return (
                <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }} className={`flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center border-2 snap-center ${selectedDate === dateStr ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-xs font-medium mb-1">{i === 0 ? 'היום' : i === 1 ? 'מחר' : DAYS_OF_WEEK[date.getDay()]}</span>
                  <span className="text-2xl font-bold">{date.getDate()}</span>
                  <span className="text-xs">{date.getMonth() + 1}/{date.getFullYear().toString().slice(2)}</span>
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <div className="mt-6 animate-slide-up">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="text-pink-500" size={20} /> באיזו שעה?</h3>
              {getAvailableHoursForDate(selectedDate).length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {getAvailableHoursForDate(selectedDate).map(hour => (
                    <button key={hour} onClick={() => setSelectedTime(hour)} className={`py-3 rounded-xl text-sm font-bold ${selectedTime === hour ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'}`}>{hour}</button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-2xl border-dashed border-2 border-gray-300"><p className="text-gray-500">כל התורים נתפסו היום 🥺</p></div>
              )}
            </div>
          )}
          {selectedDate && selectedTime && (
            <div className="mt-8 animate-slide-up">
              <button onClick={() => setStep(3)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2">המשך לפרטים <ArrowRight size={20} /></button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="p-6 fade-in h-full flex flex-col">
          <button onClick={() => setStep(2)} className="text-gray-500 mb-6 flex items-center gap-1"><ArrowRight size={16} /> חזרה</button>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">עוד צעד אחד קטן...</h2>
          <form onSubmit={submitBooking} className="space-y-5 flex-1 pb-4 mt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">שם מלא <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl focus:border-pink-400 outline-none" placeholder="איך קוראים לך מהממת?" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">טלפון <span className="text-red-500">*</span></label>
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl text-right focus:border-pink-400 outline-none" placeholder="05X-XXXXXXX" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">הערות (לא חובה)</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl resize-none h-24 focus:border-pink-400 outline-none" placeholder="נשברה ציפורן? בקשה מיוחדת?" />
            </div>
            <button type="submit" className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg mt-4 shadow-lg hover:bg-pink-700">אשרי את התור! ✨</button>
          </form>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center fade-in bg-white/90">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500"><CheckCircle size={50} /></div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">איזה כיף! 🥳</h2>
          <p className="text-xl text-pink-600 font-bold mb-4">התור שלך נקבע בהצלחה</p>
          <button onClick={() => { setStep(1); setSelectedServices([]); setSelectedExtras([]); setSelectedDate(''); setSelectedTime(''); setFormData({ name: '', phone: '', notes: '' }); }} className="mt-8 text-gray-500 font-medium underline">חזרה לדף הראשי</button>
        </div>
      )}
    </div>
  );
}

// ==========================================
//              צד מנהלת (Admin View)
// ==========================================
function AdminView({ schedule, appointments, logoUrl, whatsappTemplate, onUpdateSetting, onDeleteAppointment, onUpdateAppointment }) {
  const [activeTab, setActiveTab] = useState('appointments');
  const [lastCheckedNotes, setLastCheckedNotes] = useState(() => parseInt(localStorage.getItem('lihi_last_notif')) || Date.now());

  // מערכת התראות לתורים חדשים
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
        <h2 className="text-2xl font-bold">לוח בקרה 👑</h2>
        <button onClick={() => handleTabClick('appointments')} className="relative p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
          <Bell size={20} className="text-pink-400" />
          {newApptsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-md">
              {newApptsCount}
            </span>
          )}
        </button>
      </div>

      {/* תפריט ניווט תחתון למנהלת */}
      <div className="flex px-4 mt-6 gap-2 overflow-x-auto hide-scrollbar pb-2">
        <button onClick={() => handleTabClick('appointments')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all ${activeTab === 'appointments' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
          <Calendar size={16} /> תורים
        </button>
        <button onClick={() => handleTabClick('analytics')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
          <BarChart3 size={16} /> הכנסות
        </button>
        <button onClick={() => handleTabClick('broadcast')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all ${activeTab === 'broadcast' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
          <Megaphone size={16} /> תפוצה
        </button>
        <button onClick={() => handleTabClick('settings')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all ${activeTab === 'settings' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
          <Settings size={16} /> הגדרות
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'appointments' && <AdminAppointmentsList appointments={appointments} onDeleteAppointment={onDeleteAppointment} onUpdateAppointment={onUpdateAppointment} whatsappTemplate={whatsappTemplate} />}
        {activeTab === 'analytics' && <AdminAnalytics appointments={appointments} />}
        {activeTab === 'broadcast' && <AdminBroadcast appointments={appointments} />}
        {activeTab === 'settings' && <AdminScheduleSettings schedule={schedule} logoUrl={logoUrl} whatsappTemplate={whatsappTemplate} onUpdateSetting={onUpdateSetting} />}
      </div>
    </div>
  );
}

// ================== עמוד תורים מאורגן ==================
function AdminAppointmentsList({ appointments, onDeleteAppointment, onUpdateAppointment, whatsappTemplate }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  // חילוץ תאריכים ייחודיים ומיון מהקרוב לרחוק
  const sortedAppointments = [...appointments].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  
  // קיבוץ תורים לפי תאריכים
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
    const totalH = editData.services.reduce((sum, s) => sum + (s.hours || 1), 0);
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
              <CalendarIcon size={18} /> יום {dayName}, {formattedDate}
            </h3>
            
            <div className="space-y-3">
              {groupedAppts[dateStr].map(appt => {
                const isNew = appt.createdAt && (Date.now() - appt.createdAt < 24 * 60 * 60 * 1000); // תור שנקבע ב24 שעות האחרונות
                
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
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-bold">ביטול</button>
                        <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">שמור</button>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={appt.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${isNew ? 'border-pink-400 bg-pink-50/30' : 'border-gray-100'} flex justify-between items-start relative`}>
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-pink-500 rounded-r-2xl"></div>
                    <div className="pr-2">
                      <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {appt.time} - {appt.name}
                        {isNew && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-normal animate-pulse">חדש!</span>}
                      </div>
                      <div className="text-xs mt-1 font-semibold text-pink-600 bg-pink-100 inline-block px-2 py-1 rounded">
                        {appt.services && appt.services.map(s => s.label.split('-')[0].trim()).join(' + ')}
                      </div>
                      <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                        📞 <a href={`tel:${appt.phone}`} className="hover:underline">{appt.phone}</a>
                      </div>
                      {appt.notes && <div className="mt-2 text-xs text-gray-600 bg-orange-50 border border-orange-100 p-2 rounded-lg"><span className="font-bold">הערות:</span> {appt.notes}</div>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => sendWhatsAppConfirmation(appt)} className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center"><MessageCircle size={16} /></button>
                      <button onClick={() => handleEditClick(appt)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Edit2 size={16} /></button>
                      <button onClick={() => { if(window.confirm('למחוק תור זה?')) onDeleteAppointment(appt.id); }} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><X size={16} /></button>
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

// ================== עמוד הכנסות וסטטיסטיקה ==================
function AdminAnalytics({ appointments }) {
  // פונקציית עזר לחישוב מחיר של תור בודד
  const getApptPrice = (appt) => {
    let total = 0;
    const items = [...(appt.services || []), ...(appt.extras || [])];
    items.forEach(item => {
      if (item.price) { total += item.price; } 
      else {
        // גיבוי: חילוץ מספר מהטקסט במידה ואין שדה מחיר (לתורים ישנים)
        const match = item.label ? item.label.match(/(\d+)\s*₪/) : null;
        if (match) total += parseInt(match[1]);
      }
    });
    return total;
  };

  // הכנת נתונים לפי חודשים
  const monthlyData = {};
  let totalYearlyIncome = 0;
  
  appointments.forEach(appt => {
    if (!appt.date) return;
    const [year, month] = appt.date.split('-'); // "2026-05"
    const monthKey = `${month}/${year.substring(2)}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { name: monthKey, income: 0, count: 0 };
    }
    
    const price = getApptPrice(appt);
    monthlyData[monthKey].income += price;
    monthlyData[monthKey].count += 1;
    totalYearlyIncome += price;
  });

  // הפיכה למערך ומיון כרונולוגי
  const chartData = Object.values(monthlyData).sort((a, b) => {
    const [m1, y1] = a.name.split('/');
    const [m2, y2] = b.name.split('/');
    return new Date(`20${y1}-${m1}-01`) - new Date(`20${y2}-${m2}-01`);
  });

  return (
    <div className="pb-10 animate-fade-in">
      <div className="bg-gradient-to-br from-pink-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg mb-6">
        <h3 className="text-sm font-medium opacity-90 mb-1">הכנסות מכלל התורים שנקבעו</h3>
        <div className="text-4xl font-black mb-2">₪{totalYearlyIncome.toLocaleString()}</div>
        <div className="text-sm flex items-center gap-1 opacity-90"><TrendingUp size={16}/> סטטיסטיקה היסטורית ועתידית</div>
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
            <div className="text-lg font-black text-pink-600">₪{data.income.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">{data.count} לקוחות קבעו</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================== עמוד הודעות תפוצה ==================
function AdminBroadcast({ appointments }) {
  const [copied, setCopied] = useState(false);

  // חילוץ מספרי טלפון ייחודיים בלבד
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
    <div className="pb-10 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><Megaphone size={32} /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">שליחת הודעת תפוצה בווצאפ</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
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

      <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 text-yellow-800 text-sm">
        <strong>איך עושים את זה?</strong>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>לחצי על הכפתור הכחול למעלה להעתקת המספרים.</li>
          <li>כנסי לווצאפ, לחצי על 3 הנקודות ובחרי "רשימת תפוצה חדשה" (New broadcast).</li>
          <li>הדביקי את המספרים בתיבת החיפוש והוסיפי אותם.</li>
          <li>שלחי את ההודעה הרצויה לכולן בבת אחת! 💬</li>
        </ol>
      </div>
    </div>
  );
}

// ================== עמוד הגדרות ==================
function AdminScheduleSettings({ schedule, logoUrl, whatsappTemplate, onUpdateSetting }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const toggleHour = (hour) => {
    const currentHours = schedule[selectedDay] || [];
    const newHours = currentHours.includes(hour) ? currentHours.filter(h => h !== hour) : [...currentHours, hour].sort();
    onUpdateSetting('schedule', { ...schedule, [selectedDay]: newHours });
  };

  return (
    <div className="pb-10 text-right" dir="rtl">
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {DAYS_OF_WEEK.map((dayName, index) => index !== 6 && ( 
          <button key={index} onClick={() => setSelectedDay(index)} className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all ${selectedDay === index ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border'}`}>{dayName}</button>
        ))}
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

export default function App() {
  return (
    <ErrorBoundary>
      <LihiNailsApp />
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.4s ease-out; } .animate-slide-up { animation: slideUp 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}} />
    </ErrorBoundary>
  );
}
