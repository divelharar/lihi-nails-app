import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Heart, Star, CheckCircle, Settings, User, ArrowRight, CalendarPlus, X, Menu, ChevronLeft, ChevronRight, Edit2, ChevronDown, ChevronUp, PlusCircle, MessageCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- החיבור שלך ל-Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDlXeIC2YiBFk2uq_b81AQljiT-Bmf-QgI",
  authDomain: "lihi-nails.firebaseapp.com",
  projectId: "lihi-nails",
  storageBucket: "lihi-nails.firebasestorage.app",
  messagingSenderId: "504139844570",
  appId: "1:504139844570:web:79e7779b643c7acf464ee3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- לוכד שגיאות ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-600 min-h-screen font-sans" dir="ltr">
          <h2 className="text-2xl font-bold mb-4 border-b border-red-200 pb-2">משהו השתבש 🛠️</h2>
          <pre className="bg-white p-4 rounded-xl shadow-sm border border-red-100 overflow-auto text-sm font-mono whitespace-pre-wrap text-left">
            {this.state.error && this.state.error.toString()}
          </pre>
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
  { id: 'gel_anatomy', label: 'לק ג\'ל אנטומי - 150 ₪', hours: 1 },
  { id: 'gel_refill', label: 'מילוי בג\'ל בנייה - 160 ₪', hours: 1 },
  { id: 'gel_feet', label: 'לק ג\'ל רגליים - 130 ₪', hours: 1 },
  { id: 'new_build', label: 'בנייה חדשה - 300 ₪', hours: 2 } 
];

const AVAILABLE_EXTRAS = [
  { id: 'extra_nail', label: '⭐ השלמת ציפורן - 10₪ (עד 2 ציפורניים במקסימום לטיפול)' },
  { id: 'extra_art', label: '🎨 קישוטים - בתוספת 10 ₪ (בתיאום מראש)' },
  { id: 'extra_fix', label: '🛠️ תיקון חלק מהציפורן - 20 ₪' }
];

const DEFAULT_WHATSAPP_TEMPLATE = `היי [שם_לקוחה] המהממת! 🌸
רציתי לאשר את התור שלך אצל ליהיא ניילס (Lihi Nails):

🗓️ תאריך: [תאריך]
🕒 שעה: [שעה]
💅 טיפולים: [טיפולים]

📍 הכתובת שלנו: ח"ן 1, אשקלון.

מחכה לך לזמן של פינוק! 💖`;

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

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error(err));
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
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
    if (!user) return;
    try { await addDoc(collection(db, 'appointments'), newAppt); } catch(e) { console.error(e); }
  };

  const handleDeleteAppointment = async (id) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'appointments', id)); } catch(e) { console.error(e); }
  };

  const handleUpdateAppointment = async (id, updatedData) => {
    if (!user) return;
    try { await updateDoc(doc(db, 'appointments', id), updatedData); } catch(e) { console.error(e); }
  };

  const handleUpdateSetting = async (field, value) => {
    if (!user) return;
    try { await setDoc(doc(db, 'settings', 'main'), { [field]: value }, { merge: true }); } catch(e) { console.error(e); }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center font-sans" dir="rtl">
        <div className="animate-bounce mb-4 text-pink-500"><Heart size={48} fill="currentColor" /></div>
        <h2 className="text-xl font-bold text-gray-800">טוען את היומן של Lihi Nails... 💅</h2>
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

        <main className="max-w-md mx-auto min-h-[calc(100vh-80px)] bg-white/95 backdrop-blur-md shadow-2xl sm:rounded-b-3xl overflow-hidden relative border-x border-b border-white/50">
          {view === 'customer' && <CustomerView schedule={schedule} appointments={appointments} onBook={handleAddAppointment} logoUrl={logoUrl} />}
          {view === 'auth' && (
            <div className="p-8 flex flex-col items-center justify-center h-full min-h-[60vh] text-center fade-in bg-white/90">
              <img src={logoUrl} alt="לוגו" className="w-24 h-24 rounded-full border-4 border-pink-100 shadow-md mb-6 object-cover bg-white" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">כניסת מנהלת 👑</h2>
              <p className="text-gray-500 mb-8 text-sm">היי ליהיא! הקלידי את קוד הגישה שלך כדי לנהל את התורים:</p>
              <div className="w-full max-w-[250px]">
                <input 
                  type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className={`text-center text-3xl tracking-[0.5em] w-full p-4 bg-gray-50 border-2 ${pinError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-pink-400'} rounded-2xl outline-none mb-2`}
                  placeholder="****" maxLength={4} dir="ltr"
                />
                <div className="h-6 mb-4">{pinError && <p className="text-red-500 text-xs font-bold animate-pulse">קוד שגוי, נסי שוב.</p>}</div>
                <button onClick={handleAdminLogin} className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-pink-700 transition-colors shadow-lg mb-4">היכנסי ליומן</button>
                <button onClick={() => { setView('customer'); setPin(''); setPinError(false); }} className="text-gray-500 font-medium hover:text-pink-600 underline text-sm">חזרה למסך הראשי</button>
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

  const scrollDates = (dir) => {
    if (dateContainerRef.current) dateContainerRef.current.scrollBy({ left: dir === 'next' ? -200 : 200, behavior: 'smooth' });
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

  const generateGoogleCalendarLink = () => {
    const d = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    d.setHours(parseInt(hours), parseInt(minutes), 0);
    const endD = new Date(d.getTime() + totalHours * 60 * 60 * 1000); 
    const pad = n => n.toString().padStart(2, '0');
    const formatForGcal = (date) => `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('תור לציפורניים אצל Lihi Nails 💅')}&dates=${formatForGcal(d)}/${formatForGcal(endD)}&details=${encodeURIComponent('זמן הפינוק שלך הגיע!')}`;
  };

  return (
    <div className="flex flex-col h-full bg-transparent pb-10">
      {step === 1 && (
        <div className="bg-gradient-to-r from-pink-600 to-pink-500 text-white p-6 pb-8 rounded-b-[40px] shadow-lg relative overflow-hidden border-b-[3px] border-pink-300">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-pink-400 rounded-full opacity-50 blur-2xl"></div>
          <div className="absolute bottom-[-30px] left-[-20px] w-24 h-24 bg-pink-400 rounded-full opacity-50 blur-xl"></div>
          <div className="relative z-10 text-center flex flex-col items-center">
            <img src={logoUrl} alt="Lihi Nails" className="w-28 h-28 rounded-full border-4 border-white/40 shadow-xl mb-4 object-cover bg-white" />
            <h2 className="text-2xl font-bold mb-2 drop-shadow-md">ליהיא ניילס - מומחית ללק ג'ל 👑💅</h2>
            <p className="text-pink-50 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">שנים של ניסיון בתחום, הקפדה על הפרטים הקטנים ביותר ומאות לקוחות שכבר התמכרו. בואי להתפנק! 💖✨</p>
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
                <button key={service.id} onClick={() => toggleService(service)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-pink-500 bg-pink-50/90' : 'border-gray-200 bg-white/90'}`}>
                  <span className={`font-bold ${isSelected ? 'text-pink-700' : 'text-gray-700'}`}>{service.label}</span>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'}`}>{isSelected && <CheckCircle size={16} />}</div>
                </button>
              );
            })}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <button onClick={() => setIsExtrasOpen(!isExtrasOpen)} className="w-full flex items-center justify-between bg-white/80 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 font-bold text-gray-800"><PlusCircle size={18} className="text-pink-500"/> תוספות לשדרוג (לא חובה)</div>
                {isExtrasOpen ? <ChevronUp size={20} className="text-gray-500"/> : <ChevronDown size={20} className="text-gray-500"/>}
              </button>
              {isExtrasOpen && (
                <div className="mt-3 space-y-2 animate-slide-up">
                  {AVAILABLE_EXTRAS.map(extra => {
                    const isSelected = selectedExtras.some(e => e.id === extra.id);
                    return (
                      <button key={extra.id} onClick={() => toggleExtra(extra)} className={`w-full flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'border-pink-400 bg-pink-50' : 'border-gray-100 bg-white'}`}>
                        <span className={`text-right font-medium text-sm ${isSelected ? 'text-pink-700' : 'text-gray-600'}`}>{extra.label}</span>
                        <div className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center mr-3 ${isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'}`}>{isSelected && <CheckCircle size={14} />}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {selectedServices.length > 0 && (
            <div className="mt-8 mb-4 animate-slide-up">
              <div className="bg-pink-100 text-pink-800 p-3 rounded-xl mb-4 text-sm font-medium text-center">זמן הטיפול המשוער: {totalHours === 1 ? 'שעה 1' : `${totalHours} שעות`}</div>
              <button onClick={() => setStep(2)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2 shadow-lg">המשך לבחירת תאריך <ArrowRight size={20} /></button>
            </div>
          )}
          <div className="mt-8 mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center text-xs text-rose-800">
            <strong>שימי לב:</strong> ביטול פחות מ-24 שעות מראש יחויב ב-50% מעלות הטיפול. 💖
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="px-5 mt-6 fade-in">
          <button onClick={() => setStep(1)} className="text-gray-500 mb-4 flex items-center gap-1"><ArrowRight size={16} /> חזרה</button>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="text-pink-500" size={20} /> מתי נוח לך?</h3>
            <div className="flex gap-2">
              <button onClick={() => scrollDates('prev')} className="p-1.5 bg-white border border-gray-200 rounded-full"><ChevronRight size={18} /></button>
              <button onClick={() => scrollDates('next')} className="p-1.5 bg-white border border-gray-200 rounded-full"><ChevronLeft size={18} /></button>
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
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-300"><p className="text-gray-500">כל התורים נתפסו היום. נסי תאריך אחר.</p></div>
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
              <label className="block text-sm font-bold text-gray-700 mb-2">איך קוראים לך מהממת? <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl" placeholder="שם מלא" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">מספר טלפון <span className="text-red-500">*</span></label>
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl text-right" placeholder="05X-XXXXXXX" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">הערות מיוחדות? (לא חובה)</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl resize-none h-24" />
            </div>
            <button type="submit" className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg mt-4">אשרי את התור! ✨</button>
          </form>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center fade-in bg-white/90">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500"><CheckCircle size={50} /></div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">איזה כיף! 🥳</h2>
          <p className="text-xl text-pink-600 font-bold mb-4">התור שלך נקבע בהצלחה</p>
          <div className="w-full space-y-3 mb-6 mt-4">
            <a href={generateGoogleCalendarLink()} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3"><CalendarPlus size={24} /> הוספה ל-Google Calendar</a>
          </div>
          <button onClick={() => { setStep(1); setSelectedServices([]); setSelectedExtras([]); setSelectedDate(''); setSelectedTime(''); setFormData({ name: '', phone: '', notes: '' }); }} className="text-gray-500 font-medium underline">חזרה לדף הראשי</button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.4s ease-out; } .animate-slide-up { animation: slideUp 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}} />
    </div>
  );
}

function AdminView({ schedule, appointments, logoUrl, whatsappTemplate, onUpdateSetting, onDeleteAppointment, onUpdateAppointment }) {
  const [activeTab, setActiveTab] = useState('appointments');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-gray-900 text-white p-5 rounded-b-3xl">
        <h2 className="text-2xl font-bold mb-1">היי ליהיא! 👑</h2>
      </div>
      <div className="flex px-4 mt-6 gap-2">
        <button onClick={() => setActiveTab('appointments')} className={`flex-1 py-3 font-bold text-sm rounded-xl ${activeTab === 'appointments' ? 'bg-pink-100 text-pink-700' : 'bg-white text-gray-500 border border-gray-200'}`}>התורים שלי</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 font-bold text-sm rounded-xl ${activeTab === 'settings' ? 'bg-pink-100 text-pink-700' : 'bg-white text-gray-500 border border-gray-200'}`}>הגדרות</button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'appointments' ? <AdminAppointmentsList appointments={appointments} onDeleteAppointment={onDeleteAppointment} onUpdateAppointment={onUpdateAppointment} whatsappTemplate={whatsappTemplate} /> : <AdminScheduleSettings schedule={schedule} logoUrl={logoUrl} whatsappTemplate={whatsappTemplate} onUpdateSetting={onUpdateSetting} />}
      </div>
    </div>
  );
}

function AdminAppointmentsList({ appointments, onDeleteAppointment, onUpdateAppointment, whatsappTemplate }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  const sortedAppointments = [...appointments].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

  const sendWhatsAppConfirmation = (appt) => {
    let cleanPhone = appt.phone ? appt.phone.replace(/\D/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = '972' + cleanPhone.substring(1);
    const servicesText = appt.services ? appt.services.map(s => s.label.split('-')[0].trim()).join(', ') : appt.service;
    const extrasText = appt.extras && appt.extras.length > 0 ? `\n➕ תוספות: ${appt.extras.map(e => e.label.split('-')[0].trim()).join(', ')}` : '';
    const formattedDate = appt.date ? appt.date.split('-').reverse().join('/') : '';
    let message = whatsappTemplate.replace(/\[שם_לקוחה\]/g, appt.name || '').replace(/\[תאריך\]/g, formattedDate).replace(/\[שעה\]/g, appt.time || '').replace(/\[טיפולים\]/g, `${servicesText}${extrasText}`);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEditClick = (appt) => {
    setEditingId(appt.id);
    setEditData({ ...appt, services: appt.services || [], extras: appt.extras || [] });
  };

  const handleSaveEdit = () => {
    const totalH = editData.services.reduce((sum, s) => sum + s.hours, 0);
    const blockedHours = [];
    if (editData.time) {
      const [baseH] = editData.time.split(':').map(Number);
      for (let i = 0; i < totalH; i++) blockedHours.push(`${(baseH + i).toString().padStart(2, '0')}:00`);
    }
    onUpdateAppointment(editingId, { ...editData, totalHours: totalH, blockedHours });
    setEditingId(null); setEditData(null);
  };

  return (
    <div className="space-y-4 pb-10">
      {sortedAppointments.map((appt) => {
        if (editingId === appt.id) {
          return (
            <div key={appt.id} className="bg-pink-50 p-4 rounded-2xl shadow-sm border border-pink-300 relative">
              <div className="space-y-3 mb-4">
                <input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" placeholder="שם" />
                <input type="tel" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" placeholder="טלפון" dir="ltr" />
                <input type="date" value={editData.date || ''} onChange={e => setEditData({...editData, date: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
                <input type="time" value={editData.time || ''} onChange={e => setEditData({...editData, time: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-bold">ביטול</button>
                <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">שמור</button>
              </div>
            </div>
          );
        }
        return (
          <div key={appt.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start relative group">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-pink-500"></div>
            <div className="pr-2">
              <div className="font-bold text-gray-900 text-lg">{appt.name}</div>
              <div className="text-sm text-gray-600 mt-1">{appt.date && appt.date.split('-').reverse().join('/')} | {appt.time}</div>
              <div className="text-xs mt-1 font-semibold text-pink-600">{appt.services && appt.services.map(s => s.label.split('-')[0].trim()).join(' + ')}</div>
              <div className="mt-1 text-sm text-gray-600">{appt.phone}</div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => sendWhatsAppConfirmation(appt)} className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center"><MessageCircle size={16} /></button>
              <button onClick={() => handleEditClick(appt)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Edit2 size={16} /></button>
              <button onClick={() => { if(window.confirm('למחוק?')) onDeleteAppointment(appt.id); }} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><X size={16} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminScheduleSettings({ schedule, logoUrl, whatsappTemplate, onUpdateSetting }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const toggleHour = (hour) => {
    const currentHours = schedule[selectedDay] || [];
    const newHours = currentHours.includes(hour) ? currentHours.filter(h => h !== hour) : [...currentHours, hour].sort();
    onUpdateSetting('schedule', { ...schedule, [selectedDay]: newHours });
  };

  return (
    <div className="pb-10">
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {DAYS_OF_WEEK.map((dayName, index) => index !== 6 && ( 
          <button key={index} onClick={() => setSelectedDay(index)} className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm ${selectedDay === index ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border'}`}>{dayName}</button>
        ))}
      </div>
      <div className="mt-4 bg-white p-5 rounded-2xl shadow-sm">
        <h3 className="font-bold mb-4">שעות פתוחות</h3>
        <div className="grid grid-cols-3 gap-3">
          {ALL_POSSIBLE_HOURS.map(hour => (
            <button key={hour} onClick={() => toggleHour(hour)} className={`py-2 rounded-lg text-sm font-bold border-2 ${schedule[selectedDay]?.includes(hour) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-transparent text-gray-400'}`}>{hour}</button>
          ))}
        </div>
      </div>
      <div className="mt-6 bg-white p-5 rounded-2xl shadow-sm">
        <h3 className="font-bold mb-4">לוגו האתר (URL)</h3>
        <input type="text" value={logoUrl} onChange={(e) => onUpdateSetting('logoUrl', e.target.value)} className="w-full p-3 border rounded-xl text-sm" dir="ltr" />
      </div>
      <div className="mt-6 bg-white p-5 rounded-2xl shadow-sm">
        <h3 className="font-bold mb-4">תבנית ווצאפ</h3>
        <textarea value={whatsappTemplate} onChange={(e) => onUpdateSetting('whatsappTemplate', e.target.value)} className="w-full p-3 border rounded-xl text-sm h-48 resize-none" dir="rtl" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LihiNailsApp />
    </ErrorBoundary>
  );
}
