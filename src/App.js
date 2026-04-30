import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Heart, Star, CheckCircle, Settings, User, ArrowRight, CalendarPlus, X, Menu, ChevronLeft, ChevronRight, Edit2, ChevronDown, ChevronUp, PlusCircle, MessageCircle } from 'lucide-react';

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

export default function App() {
  const [view, setView] = useState('customer');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // שמירה מקומית (LocalStorage) 
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem('lihi_appointments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('lihi_schedule');
      return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE;
    } catch (e) { return DEFAULT_SCHEDULE; }
  });

  const [whatsappTemplate, setWhatsappTemplate] = useState(() => {
    return localStorage.getItem('lihi_whatsapp') || DEFAULT_WHATSAPP_TEMPLATE;
  });

  const [logoUrl, setLogoUrl] = useState(() => {
    return localStorage.getItem('lihi_logo') || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=400&auto=format&fit=crop';
  });

  // שמירה לזיכרון בכל פעם שיש שינוי
  useEffect(() => { localStorage.setItem('lihi_appointments', JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem('lihi_schedule', JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem('lihi_whatsapp', whatsappTemplate); }, [whatsappTemplate]);
  useEffect(() => { localStorage.setItem('lihi_logo', logoUrl); }, [logoUrl]);

  // פונקציות ניהול נתונים
  const handleAddAppointment = (newAppt) => {
    setAppointments([...appointments, { ...newAppt, id: Date.now().toString() }]);
  };

  const handleDeleteAppointment = (id) => {
    setAppointments(appointments.filter(a => a.id !== id));
  };

  const handleUpdateAppointment = (id, updatedData) => {
    setAppointments(appointments.map(a => a.id === id ? updatedData : a));
  };

  const handleUpdateSetting = (field, value) => {
    if (field === 'schedule') setSchedule(value);
    if (field === 'logoUrl') setLogoUrl(value);
    if (field === 'whatsappTemplate') setWhatsappTemplate(value);
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
            >
              {view === 'customer' ? <Settings size={20} /> : <User size={20} />}
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto min-h-[calc(100vh-80px)] bg-white/95 backdrop-blur-md shadow-2xl sm:rounded-b-3xl overflow-hidden relative border-x border-b border-white/50">
          {view === 'customer' && (
            <CustomerView 
              schedule={schedule} 
              appointments={appointments} 
              onBook={handleAddAppointment} 
              logoUrl={logoUrl}
            />
          )}
          
          {view === 'auth' && (
            <div className="p-8 flex flex-col items-center justify-center h-full min-h-[60vh] text-center fade-in bg-white/90">
              <img src={logoUrl} alt="לוגו Lihi Nails" className="w-24 h-24 rounded-full border-4 border-pink-100 shadow-md mb-6 object-cover bg-white" />
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
              appointments={appointments} 
              logoUrl={logoUrl}
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
          >
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </a>
        )}
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

  const toggleService = (service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const toggleExtra = (extra) => {
    if (selectedExtras.find(e => e.id === extra.id)) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const totalHours = selectedServices.reduce((sum, s) => sum + s.hours, 0);

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (d.getDay() !== 6) { 
        days.push(d);
      }
    }
    return days;
  };

  const scrollDates = (direction) => {
    if (dateContainerRef.current) {
      const scrollAmount = direction === 'next' ? -200 : 200;
      dateContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getAvailableHoursForDate = (dateString) => {
    if (!dateString) return [];
    const dateObj = new Date(dateString);
    const dayOfWeek = dateObj.getDay();
    
    const hoursForDay = schedule[dayOfWeek] || [];
    
    const bookedHours = [];
    appointments.forEach(appt => {
      if (appt.date === dateString) {
        if (appt.blockedHours) {
          bookedHours.push(...appt.blockedHours);
        } else {
          bookedHours.push(appt.time);
        }
      }
    });
      
    const freeHours = hoursForDay.filter(hour => !bookedHours.includes(hour));

    const validStartTimes = [];
    freeHours.forEach(startHour => {
      let isValid = true;
      const [baseH] = startHour.split(':').map(Number);

      for (let i = 0; i < totalHours; i++) {
        const checkHour = `${(baseH + i).toString().padStart(2, '0')}:00`;
        if (!freeHours.includes(checkHour)) {
          isValid = false;
          break;
        }
      }

      if (isValid) {
        validStartTimes.push(startHour);
      }
    });

    return validStartTimes;
  };

  const handleDateSelect = (dateString) => {
    setSelectedDate(dateString);
    setSelectedTime('');
  };

  const submitBooking = (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !formData.name || !formData.phone || selectedServices.length === 0) return;
    
    const blockedHours = [];
    const [baseH] = selectedTime.split(':').map(Number);
    for (let i = 0; i < totalHours; i++) {
      blockedHours.push(`${(baseH + i).toString().padStart(2, '0')}:00`);
    }

    onBook({
      date: selectedDate,
      time: selectedTime,
      blockedHours,
      services: selectedServices,
      extras: selectedExtras,
      totalHours,
      ...formData
    });
    setStep(4);
  };

  const generateGoogleCalendarLink = () => {
    const d = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    d.setHours(parseInt(hours), parseInt(minutes), 0);
    const endD = new Date(d.getTime() + totalHours * 60 * 60 * 1000); 
    
    const pad = n => n.toString().padStart(2, '0');
    const formatForGcal = (date) => `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    
    const startStr = formatForGcal(d);
    const endStr = formatForGcal(endD);
    const text = encodeURIComponent('תור לציפורניים אצל Lihi Nails 💅');
    const details = encodeURIComponent('זמן הפינוק שלך הגיע! מחכה לך באהבה - ליהיא.');
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}`;
  };

  const generateAppleCalendarLink = () => {
    const d = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    d.setHours(parseInt(hours), parseInt(minutes), 0);
    const endD = new Date(d.getTime() + totalHours * 60 * 60 * 1000);
    
    const pad = n => n.toString().padStart(2, '0');
    const formatForICS = (date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    
    const startStr = formatForICS(d);
    const endStr = formatForICS(endD);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      'SUMMARY:תור לציפורניים אצל Lihi Nails 💅',
      'DESCRIPTION:זמן הפינוק שלך הגיע! מחכה לך באהבה - ליהיא.',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    return URL.createObjectURL(blob);
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
            <p className="text-pink-50 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
              שנים של ניסיון בתחום, הקפדה על הפרטים הקטנים ביותר ומאות לקוחות שכבר התמכרו. בואי להתפנק! 💖✨
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="px-5 mt-6 fade-in h-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Heart className="text-pink-500" size={20} />
            איזה טיפולים תרצי היום?
          </h3>
          <p className="text-sm text-gray-500 mb-4">אפשר לבחור כמה טיפולים במקביל</p>

          <div className="space-y-3 flex-1">
            {AVAILABLE_SERVICES.map(service => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              return (
                <button
                  key={service.id}
                  onClick={() => toggleService(service)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    isSelected 
                      ? 'border-pink-500 bg-pink-50/90 shadow-sm' 
                      : 'border-gray-200 bg-white/90 hover:border-pink-300'
                  }`}
                >
                  <span className={`font-bold ${isSelected ? 'text-pink-700' : 'text-gray-700'}`}>
                    {service.label}
                  </span>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle size={16} />}
                  </div>
                </button>
              );
            })}

            <div className="mt-6 border-t border-gray-200 pt-4">
              <button 
                onClick={() => setIsExtrasOpen(!isExtrasOpen)}
                className="w-full flex items-center justify-between bg-white/80 p-4 rounded-xl border border-gray-200 hover:bg-pink-50 transition-colors"
              >
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <PlusCircle size={18} className="text-pink-500"/>
                  תוספות לשדרוג (לא חובה)
                </div>
                {isExtrasOpen ? <ChevronUp size={20} className="text-gray-500"/> : <ChevronDown size={20} className="text-gray-500"/>}
              </button>

              {isExtrasOpen && (
                <div className="mt-3 space-y-2 animate-slide-up pl-2 pr-2">
                  {AVAILABLE_EXTRAS.map(extra => {
                    const isSelected = selectedExtras.some(e => e.id === extra.id);
                    return (
                      <button
                        key={extra.id}
                        onClick={() => toggleExtra(extra)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-sm ${
                          isSelected 
                            ? 'border-pink-400 bg-pink-50 shadow-sm' 
                            : 'border-gray-100 bg-white hover:border-pink-200'
                        }`}
                      >
                        <span className={`text-right font-medium ${isSelected ? 'text-pink-700' : 'text-gray-600'}`}>
                          {extra.label}
                        </span>
                        <div className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center transition-colors mr-3 ${
                          isSelected ? 'bg-pink-500 text-white' : 'border-2 border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle size={14} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedServices.length > 0 && (
            <div className="mt-8 mb-4 animate-slide-up">
              <div className="bg-pink-100 text-pink-800 p-3 rounded-xl mb-4 text-sm font-medium text-center">
                זמן הטיפול המשוער: {totalHours === 1 ? 'שעה 1' : `${totalHours} שעות`}
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-colors flex justify-center items-center gap-2 shadow-lg"
              >
                המשך לבחירת תאריך <ArrowRight size={20} />
              </button>
            </div>
          )}

          <div className="mt-8 mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center shadow-sm">
            <p className="text-xs text-rose-800 font-medium leading-relaxed">
              <strong>שימי לב:</strong> במידה ויש צורך לבטל או לשנות תור, יש לעשות זאת לפחות 24 שעות מראש. <br/>
              ביטול בפחות מ-24 שעות יחויב בדמי ביטול בסך 50% מעלות הטיפול, הזמן שלי יקר. <br/>
              תודה על ההבנה! 💖
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="px-5 mt-6 fade-in">
          <button 
            onClick={() => setStep(1)}
            className="text-gray-500 mb-4 flex items-center gap-1 hover:text-pink-600 transition-colors w-fit"
          >
            <ArrowRight size={16} /> חזרה לבחירת טיפולים
          </button>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-pink-500" size={20} />
              מתי נוח לך?
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => scrollDates('prev')} 
                className="p-1.5 bg-white border border-gray-200 rounded-full hover:bg-pink-50 text-gray-600 hover:text-pink-600 hover:border-pink-200 transition-colors shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
              <button 
                onClick={() => scrollDates('next')} 
                className="p-1.5 bg-white border border-gray-200 rounded-full hover:bg-pink-50 text-gray-600 hover:text-pink-600 hover:border-pink-200 transition-colors shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
          
          <div 
            ref={dateContainerRef}
            className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar snap-x scroll-smooth"
          >
            {getNextDays().map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isSelected = selectedDate === dateStr;
              const dayName = i === 0 ? 'היום' : i === 1 ? 'מחר' : DAYS_OF_WEEK[date.getDay()];
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateSelect(dateStr)}
                  className={`flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center border-2 transition-all snap-center ${
                    isSelected 
                      ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-pink-200'
                  }`}
                >
                  <span className="text-xs font-medium mb-1">{dayName}</span>
                  <span className="text-2xl font-bold">{date.getDate()}</span>
                  <span className="text-xs">{date.getMonth() + 1}/{date.getFullYear().toString().slice(2)}</span>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-6 animate-slide-up">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-pink-500" size={20} />
                באיזו שעה?
              </h3>
              <p className="text-xs text-gray-500 mb-3">מציג רק שעות שיש בהן זמן מספיק לכל הטיפולים שבחרת ({totalHours} שעות)</p>
              
              {getAvailableHoursForDate(selectedDate).length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {getAvailableHoursForDate(selectedDate).map(hour => (
                    <button
                      key={hour}
                      onClick={() => setSelectedTime(hour)}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${
                        selectedTime === hour
                          ? 'bg-pink-600 text-white shadow-md transform scale-105'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-400'
                      }`}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500">אוי לא! 🥺<br/>כל התורים ביום הזה נתפסו.<br/>נסי לבחור תאריך אחר.</p>
                </div>
              )}
            </div>
          )}

          {selectedDate && selectedTime && (
            <div className="mt-8 animate-slide-up">
              <button 
                onClick={() => setStep(3)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-colors flex justify-center items-center gap-2 shadow-lg"
              >
                המשך לפרטים <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="p-6 fade-in h-full flex flex-col">
          <button 
            onClick={() => setStep(2)}
            className="text-gray-500 mb-6 flex items-center gap-1 hover:text-pink-600 transition-colors w-fit"
          >
            <ArrowRight size={16} /> חזרה לתאריכים
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">עוד צעד אחד קטן...</h2>
          <p className="text-gray-500 mb-6 text-sm">התור שלך שמור ל-{selectedDate.split('-').reverse().join('/')} בשעה {selectedTime}. רק נשאר למלא פרטים:</p>

          <div className="bg-pink-50 p-3 rounded-xl mb-6 text-sm text-pink-800 font-medium border border-pink-200">
            <div><strong>טיפולים נבחרים:</strong> {selectedServices.map(s => s.label.split('-')[0].trim()).join(', ')}</div>
            {selectedExtras.length > 0 && (
              <div className="mt-1 text-pink-700 text-xs">
                <strong>תוספות:</strong> {selectedExtras.map(e => e.label.split('-')[0].trim()).join(', ')}
              </div>
            )}
          </div>

          <form onSubmit={submitBooking} className="space-y-5 flex-1 pb-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">איך קוראים לך מהממת? <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all font-medium"
                placeholder="שם מלא"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">מספר טלפון <span className="text-red-500">*</span></label>
              <input 
                type="tel" 
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all font-medium text-right"
                placeholder="05X-XXXXXXX"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">הערות מיוחדות? (לא חובה)</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-4 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all font-medium resize-none h-24 text-sm"
                placeholder="יש משהו שליהיא צריכה לדעת מראש? (למשל: נשברה ציפורן, רוצה קישוט ספציפי...)"
              />
            </div>

            <div className="pt-4 mt-auto">
              <button 
                type="submit"
                className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-pink-700 transition-colors shadow-lg shadow-pink-200"
              >
                אשרי את התור! ✨
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center fade-in bg-white/90">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-inner">
            <CheckCircle size={50} />
          </div>
          
          <h2 className="text-3xl font-black text-gray-800 mb-2">איזה כיף! 🥳</h2>
          <p className="text-xl text-pink-600 font-bold mb-4">התור שלך נקבע בהצלחה 💅✨</p>
          
          <div className="bg-rose-50/90 rounded-2xl p-6 w-full mb-8 border border-rose-100 relative overflow-hidden shadow-sm">
             <div className="absolute -right-4 -top-4 text-pink-200 opacity-40">
               <Heart size={80} fill="currentColor" />
             </div>
             
             <p className="text-gray-700 relative z-10 leading-relaxed font-medium">
               היי {formData.name}, אני כבר מחכה לעשות לך ציפורניים מושלמות! 💖<br/><br/>
               <span className="font-bold text-gray-900 block mt-2 text-lg">
                 {selectedDate.split('-').reverse().join('/')} בשעה {selectedTime}
               </span>
             </p>
          </div>
          
          <p className="text-gray-500 mb-6 text-sm">אל תשכחי להוסיף ליומן שחלילה לא תפספסי את זמן הפינוק שלך!</p>
          
          <div className="w-full space-y-3 mb-6">
            <a 
              href={generateGoogleCalendarLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
            >
              <CalendarPlus size={24} />
              הוסיפי ליומן (Google)
            </a>

            <a 
              href={generateAppleCalendarLink()}
              download="LihiNails_Appointment.ics"
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-3 shadow-lg shadow-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 384 512" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              הוסיפי ליומן (Apple)
            </a>
          </div>

          <button 
            onClick={() => {
              setStep(1);
              setSelectedServices([]);
              setSelectedExtras([]);
              setIsExtrasOpen(false);
              setSelectedDate('');
              setSelectedTime('');
              setFormData({ name: '', phone: '', notes: '' });
            }}
            className="text-gray-500 font-medium hover:text-pink-600 underline"
          >
            חזרה לדף הראשי
          </button>
        </div>
      )}

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

function AdminView({ schedule, appointments, logoUrl, whatsappTemplate, onUpdateSetting, onDeleteAppointment, onUpdateAppointment }) {
  const [activeTab, setActiveTab] = useState('appointments');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-gray-900 text-white p-5 rounded-b-3xl">
        <h2 className="text-2xl font-bold mb-1">היי ליהיא! 👑</h2>
        <p className="text-gray-400 text-sm">ניהול התורים והשעות של Lihi Nails</p>
      </div>

      <div className="flex px-4 mt-6 gap-2">
        <button 
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 py-3 font-bold text-sm rounded-xl transition-colors ${
            activeTab === 'appointments' ? 'bg-pink-100 text-pink-700' : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          התורים שלי
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 font-bold text-sm rounded-xl transition-colors ${
            activeTab === 'settings' ? 'bg-pink-100 text-pink-700' : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          ניהול שעות וזמינות
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'appointments' && (
          <AdminAppointmentsList 
            appointments={appointments} 
            onDeleteAppointment={onDeleteAppointment}
            onUpdateAppointment={onUpdateAppointment}
            whatsappTemplate={whatsappTemplate} 
          />
        )}
        {activeTab === 'settings' && (
          <AdminScheduleSettings 
            schedule={schedule} 
            logoUrl={logoUrl} 
            whatsappTemplate={whatsappTemplate} 
            onUpdateSetting={onUpdateSetting} 
          />
        )}
      </div>
    </div>
  );
}

function AdminAppointmentsList({ appointments, onDeleteAppointment, onUpdateAppointment, whatsappTemplate }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA - dateB;
  });

  const handleDelete = (id) => {
    if(window.confirm('האם את בטוחה שאת רוצה למחוק את התור הזה?')) {
      onDeleteAppointment(id);
    }
  };

  const sendWhatsAppConfirmation = (appt) => {
    let cleanPhone = appt.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }

    const servicesText = appt.services ? appt.services.map(s => s.label.split('-')[0].trim()).join(', ') : appt.service;
    const extrasText = appt.extras && appt.extras.length > 0 ? `\n➕ תוספות: ${appt.extras.map(e => e.label.split('-')[0].trim()).join(', ')}` : '';
    const fullTreatmentsText = `${servicesText}${extrasText}`;
    const formattedDate = appt.date.split('-').reverse().join('/');

    let message = whatsappTemplate
      .replace(/\[שם_לקוחה\]/g, appt.name)
      .replace(/\[תאריך\]/g, formattedDate)
      .replace(/\[שעה\]/g, appt.time)
      .replace(/\[טיפולים\]/g, fullTreatmentsText);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEditClick = (appt) => {
    setEditingId(appt.id);
    let servicesForEdit = appt.services || [];
    if (!appt.services && appt.service) {
      servicesForEdit = [{ id: 'old', label: appt.service, hours: 1 }];
    }
    setEditData({ ...appt, services: servicesForEdit, extras: appt.extras || [] });
  };

  const handleSaveEdit = () => {
    const totalH = editData.services.reduce((sum, s) => sum + s.hours, 0);
    const blockedHours = [];
    const [baseH] = editData.time.split(':').map(Number);
    for (let i = 0; i < totalH; i++) {
      blockedHours.push(`${(baseH + i).toString().padStart(2, '0')}:00`);
    }

    const updatedAppt = {
      ...editData,
      totalHours: totalH,
      blockedHours
    };
    
    onUpdateAppointment(editingId, updatedAppt);
    setEditingId(null);
    setEditData(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">עדיין אין תורים קבועים.</p>
        <p className="text-sm mt-1">שתפי את האפליקציה עם הלקוחות!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {sortedAppointments.map((appt) => {
        if (editingId === appt.id) {
          return (
            <div key={appt.id} className="bg-pink-50 p-4 rounded-2xl shadow-sm border border-pink-300 relative">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Edit2 size={16} className="text-pink-600"/> עריכת תור</h4>
              
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">שם לקוחה</label>
                  <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">טלפון</label>
                  <input type="tel" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400 text-right" dir="ltr" />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">תאריך</label>
                    <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400 text-left" dir="ltr" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">שעה</label>
                    <input type="time" value={editData.time} onChange={e => setEditData({...editData, time: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400 text-left" dir="ltr" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">סוגי טיפול (אפשר לבחור כמה)</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 p-2 rounded-lg bg-white">
                    {AVAILABLE_SERVICES.map(service => {
                      const isSelected = editData.services.some(s => s.id === service.id);
                      return (
                        <label key={service.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setEditData({...editData, services: editData.services.filter(s => s.id !== service.id)});
                              } else {
                                setEditData({...editData, services: [...editData.services, service]});
                              }
                            }}
                            className="accent-pink-600"
                          />
                          <span>{service.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">תוספות</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 p-2 rounded-lg bg-white">
                    {AVAILABLE_EXTRAS.map(extra => {
                      const isSelected = (editData.extras || []).some(e => e.id === extra.id);
                      return (
                        <label key={extra.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              const currentExtras = editData.extras || [];
                              if (isSelected) {
                                setEditData({...editData, extras: currentExtras.filter(e => e.id !== extra.id)});
                              } else {
                                setEditData({...editData, extras: [...currentExtras, extra]});
                              }
                            }}
                            className="accent-pink-600"
                          />
                          <span>{extra.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">הערות</label>
                  <textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400 h-16 resize-none" />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors">ביטול</button>
                <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition-colors">שמור שינויים</button>
              </div>
            </div>
          );
        }

        return (
          <div key={appt.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start relative overflow-hidden group">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-pink-500"></div>
            
            <div className="pr-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900 text-lg">{appt.name}</span>
                <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-bold max-w-[200px] truncate" title={appt.services ? appt.services.map(s => s.label).join(' + ') : appt.service}>
                  {appt.services ? appt.services.map(s => s.label.split('-')[0].trim()).join(' + ') : appt.service}
                </span>
              </div>
              
              {appt.extras && appt.extras.length > 0 && (
                <div className="text-xs text-gray-500 mt-1 font-medium bg-gray-50 inline-block px-2 py-1 rounded">
                  <span className="text-pink-500">➕ תוספות:</span> {appt.extras.map(e => e.label.split('-')[0].trim()).join(', ')}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                <span className="flex items-center gap-1 font-semibold text-pink-600">
                  <Calendar size={14} /> {appt.date.split('-').reverse().join('/')}
                </span>
                <span className="flex items-center gap-1 font-semibold text-pink-600">
                  <Clock size={14} /> {appt.time} - {appt.totalHours ? `${parseInt(appt.time.split(':')[0]) + appt.totalHours}:00` : ''}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                📞 {appt.phone}
              </div>
              {appt.notes && (
                <div className="mt-2 text-xs text-gray-600 bg-orange-50 border border-orange-100 p-2 rounded-lg">
                  <span className="font-bold">הערות:</span> {appt.notes}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => sendWhatsAppConfirmation(appt)}
                className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366]/20 transition-colors"
                title="שלחי הודעת אישור בווצאפ"
              >
                <MessageCircle size={16} />
              </button>
              <button 
                onClick={() => handleEditClick(appt)}
                className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors"
                title="ערוך תור"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(appt.id)}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                title="בטל תור"
              >
                <X size={16} />
              </button>
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
    let newHours;
    
    if (currentHours.includes(hour)) {
      newHours = currentHours.filter(h => h !== hour);
    } else {
      newHours = [...currentHours, hour].sort();
    }
    
    onUpdateSetting('schedule', { ...schedule, [selectedDay]: newHours });
  };

  return (
    <div className="pb-10">
      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6 flex gap-3">
        <div className="mt-1"><Menu size={18} /></div>
        <p>
          כאן את מגדירה את שעות העבודה הקבועות שלך לכל יום בשבוע. 
          לקוחות יוכלו לקבוע תורים <strong>רק</strong> לשעות שסימנת כאן כירוקות.
        </p>
      </div>

      <h3 className="font-bold text-gray-800 mb-3">בחרי יום לעריכה:</h3>
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {DAYS_OF_WEEK.map((dayName, index) => (
          index !== 6 && ( 
            <button
              key={index}
              onClick={() => setSelectedDay(index)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                selectedDay === index 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {dayName}
            </button>
          )
        ))}
      </div>

      <div className="mt-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex justify-between items-center">
          <span>שעות פעילות ביום {DAYS_OF_WEEK[selectedDay]}</span>
          <span className="text-xs font-normal text-gray-500">
            {(schedule[selectedDay] || []).length} שעות פתוחות
          </span>
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {ALL_POSSIBLE_HOURS.map(hour => {
            const isActive = (schedule[selectedDay] || []).includes(hour);
            return (
              <button
                key={hour}
                onClick={() => toggleHour(hour)}
                className={`py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                  isActive 
                    ? 'bg-green-50 border-green-500 text-green-700' 
                    : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'
                }`}
              >
                {hour}
              </button>
            );
          })}
        </div>
        
        {(schedule[selectedDay] || []).length === 0 && (
          <div className="mt-4 text-center text-sm text-gray-500 bg-gray-50 py-3 rounded-lg">
            ביום זה העסק סגור (אין שעות מסומנות).
          </div>
        )}
      </div>

      <div className="mt-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">הגדרות עיצוב 🎨</h3>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">קישור ללוגו העסק</label>
          <input 
            type="text" 
            value={logoUrl}
            onChange={(e) => onUpdateSetting('logoUrl', e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-pink-400"
            placeholder="הדביקי כאן קישור לתמונה (URL)"
            dir="ltr"
          />
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            כדי להציג את הלוגו שלך, העלי את התמונה לאתר כמו ImgBB, והדביקי כאן את הקישור הישיר לתמונה (המסתיים ב-.jpg או .png).
          </p>
        </div>
      </div>

      <div className="mt-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">תבנית הודעת ווצאפ 💬</h3>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">עריכת ההודעה לאישור תור</label>
          <textarea 
            value={whatsappTemplate}
            onChange={(e) => onUpdateSetting('whatsappTemplate', e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-pink-400 h-48 resize-none"
            dir="rtl"
          />
          <div className="text-xs text-gray-500 mt-3 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100">
            <strong className="text-blue-800 block mb-1">מילות קוד לשימוש (העתיקי אותן עם הסוגריים המרובעים):</strong>
            <ul className="list-disc list-inside space-y-1">
              <li><code>[שם_לקוחה]</code> - יוחלף בשם הלקוחה</li>
              <li><code>[תאריך]</code> - יוחלף בתאריך התור (למשל 30/04/2026)</li>
              <li><code>[שעה]</code> - יוחלף בשעת התור</li>
              <li><code>[טיפולים]</code> - יוחלף בפירוט הטיפולים והתוספות</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
