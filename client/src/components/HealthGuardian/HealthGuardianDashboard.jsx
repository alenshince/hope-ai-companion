import React, { useState, useEffect } from 'react';
import {
  Heart,
  Droplets,
  Utensils,
  Moon,
  Clock,
  Sparkles,
  Flame,
  Award,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Smile,
  Zap,
  Shield,
  RotateCcw,
  Activity,
  Sliders,
  ChevronRight,
  Eye
} from 'lucide-react';
import { api } from '../../api';
import { playCalmChime, playSuccessDing } from '../../utils/audio';

export default function HealthGuardianDashboard({ addToast }) {
  const [wellness, setWellness] = useState(null);
  const [history, setHistory] = useState([]);
  const [proactiveAlert, setProactiveAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('Inhale'); // Inhale, Hold, Exhale
  const [mealNote, setMealNote] = useState('');
  const [selectedMealForModal, setSelectedMealForModal] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadWellnessData = async () => {
    setIsLoading(true);
    try {
      const [todayData, proactiveData, historyData] = await Promise.all([
        api.getTodayWellness(),
        api.checkProactiveWellness(),
        api.getWellnessHistory()
      ]);
      setWellness(todayData);
      setProactiveAlert(proactiveData.triggered ? proactiveData : null);
      setHistory(historyData.history || []);
    } catch (err) {
      console.error('Failed to load wellness dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWellnessData();
  }, []);

  // Mindful breathing cycle
  useEffect(() => {
    if (!isBreathingActive) return;

    let timer;
    const runCycle = () => {
      setBreathingPhase('Inhale deeply (4s)...');
      timer = setTimeout(() => {
        setBreathingPhase('Hold gently (4s)...');
        timer = setTimeout(() => {
          setBreathingPhase('Exhale slowly (4s)...');
          timer = setTimeout(() => {
            runCycle();
          }, 4000);
        }, 4000);
      }, 4000);
    };

    runCycle();
    return () => clearTimeout(timer);
  }, [isBreathingActive]);

  const handleWaterDelta = async (delta) => {
    try {
      const updated = await api.logWater(delta);
      setWellness(updated);
      if (delta > 0) playSuccessDing();
      if (addToast) {
        addToast({
          type: 'hope',
          title: delta > 0 ? 'Hydration Logged 💧' : 'Water Updated',
          message: `You've logged ${updated.waterGlasses} of ${updated.targetWaterGlasses} glasses today.`
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleLogMeal = async (mealKey, note = '') => {
    try {
      const updated = await api.logMeal(mealKey, { note });
      setWellness(updated);
      setSelectedMealForModal(null);
      setMealNote('');
      playSuccessDing();

      // Clear proactive alert if it was for this meal
      if (proactiveAlert?.type === mealKey) {
        setProactiveAlert(null);
      }

      if (addToast) {
        addToast({
          type: 'success',
          title: 'Meal Logged 🍲',
          message: `${mealKey.charAt(0).toUpperCase() + mealKey.slice(1)} recorded successfully.`
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleTakeBreak = async () => {
    try {
      const updated = await api.logBreak();
      setWellness(updated);
      setIsBreathingActive(true);
      playCalmChime();
      if (addToast) {
        addToast({
          type: 'hope',
          title: 'Mindful Break Started 🌿',
          message: 'Follow the breathing rhythm to calm your nervous system.'
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleMoodSelect = async (rating) => {
    try {
      const updated = await api.logMood(rating);
      setWellness(updated);
      if (addToast) {
        addToast({
          type: 'success',
          title: 'Energy State Checked In',
          message: `Logged as ${updated.mood?.label || rating}.`
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  if (isLoading || !wellness) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 animate-spin">
            <Heart className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Synchronizing Health Guardian...</p>
        </div>
      </div>
    );
  }

  const waterPercent = Math.min(100, Math.round(((wellness.waterGlasses || 0) / (wellness.targetWaterGlasses || 8)) * 100));

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/70 p-6 md:p-8 space-y-6">
      {/* Proactive Guardian Alert (e.g. Dinner Threshold or Late Night) */}
      {proactiveAlert && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-5 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full">
                  Proactive Check-in
                </span>
                <h3 className="font-bold text-base">{proactiveAlert.title}</h3>
              </div>
              <p className="text-xs text-white/90 mt-0.5 max-w-xl leading-relaxed">
                {proactiveAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {proactiveAlert.actionType === 'log_meal' && (
              <button
                onClick={() => handleLogMeal(proactiveAlert.actionPayload?.meal || 'dinner')}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-sm transition-all"
              >
                Mark {proactiveAlert.actionPayload?.meal?.toUpperCase()} as Logged 🍲
              </button>
            )}
            {proactiveAlert.actionType === 'log_water' && (
              <button
                onClick={() => handleWaterDelta(1)}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-sm transition-all"
              >
                Log Glass of Water 💧
              </button>
            )}
            {proactiveAlert.actionType === 'take_break' && (
              <button
                onClick={handleTakeBreak}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-sm transition-all"
              >
                Start 5-Min Stretch 🌿
              </button>
            )}
            <button
              onClick={() => setProactiveAlert(null)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Routine Consistency Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Habit Streak */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Habit Streak
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{wellness.streakDays || 6}</span>
              <span className="text-xs text-slate-500 font-medium">days active</span>
            </div>
            <span className="text-[10px] text-amber-600 font-semibold mt-1 inline-block">
              🔥 Consistent Routine Flow
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Flame className="w-6 h-6 fill-amber-500" />
          </div>
        </div>

        {/* Consistency Score */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Consistency Score
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{wellness.consistencyScore || 92}%</span>
              <span className="text-xs text-emerald-600 font-semibold">Optimal</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 inline-block">
              Hydration, meals & focus
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Mindful Breaks */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Breaks Taken
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{wellness.breaksTaken || 0}</span>
              <span className="text-xs text-slate-500 font-medium">stretches</span>
            </div>
            <span className="text-[10px] text-hope-600 font-medium mt-1 inline-block">
              20-20-20 Eye Rest Active
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-hope-50 text-hope-600 flex items-center justify-center">
            <Coffee className="w-6 h-6" />
          </div>
        </div>

        {/* Current Energy State */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Current Energy
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-slate-900 truncate max-w-[130px]">
                {wellness.mood?.label || 'Calm & Centered'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 inline-block">
              {wellness.mood?.note || 'Logged today'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Smile className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Hydration & Meal Tracking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Hydration Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Hydration Guardian</h3>
                  <p className="text-xs text-slate-500">Target: {wellness.targetWaterGlasses || 8} glasses daily</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleWaterDelta(-1)}
                  disabled={wellness.waterGlasses <= 0}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-colors"
                  title="Remove glass"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleWaterDelta(1)}
                  className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-sky-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Drink Glass</span>
                </button>
              </div>
            </div>

            {/* Visual Glass Tracker */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 my-4">
              {Array.from({ length: wellness.targetWaterGlasses || 8 }).map((_, idx) => {
                const isFilled = idx < (wellness.waterGlasses || 0);
                return (
                  <button
                    key={idx}
                    onClick={() => handleWaterDelta(idx < wellness.waterGlasses ? -1 : 1)}
                    className={`py-3 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      isFilled
                        ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20 scale-100'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <Droplets className={`w-5 h-5 mb-1 ${isFilled ? 'fill-white' : ''}`} />
                    <span className="text-[10px] font-bold">#{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Progress ({wellness.waterGlasses} / {wellness.targetWaterGlasses || 8} glasses)</span>
                <span>{waterPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-500"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sky-700 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              {wellness.waterGlasses >= 8 ? "Daily hydration goal achieved! 🌟" : "Keep a fresh bottle by your desk Alen."}
            </span>
            <span className="font-mono text-slate-400">~250ml per glass</span>
          </div>
        </div>

        {/* Meal Schedule & Nourishment Tracker */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Meal Schedule & Thresholds</h3>
                  <p className="text-xs text-slate-500">Routine breakfast, lunch & dinner check-ins</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Breakfast */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Breakfast</span>
                    <span className="text-[10px] text-slate-400">08:00 - 10:00 AM</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {wellness.meals?.breakfast?.logged
                      ? `Logged at ${wellness.meals.breakfast.time} • ${wellness.meals.breakfast.note || 'Nourished'}`
                      : 'Not logged today'}
                  </p>
                </div>

                {wellness.meals?.breakfast?.logged ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete
                  </span>
                ) : (
                  <button
                    onClick={() => handleLogMeal('breakfast')}
                    className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    Log Breakfast
                  </button>
                )}
              </div>

              {/* Lunch */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Lunch</span>
                    <span className="text-[10px] text-slate-400">12:30 - 02:30 PM</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {wellness.meals?.lunch?.logged
                      ? `Logged at ${wellness.meals.lunch.time} • ${wellness.meals.lunch.note || 'Balanced meal'}`
                      : 'Not logged today'}
                  </p>
                </div>

                {wellness.meals?.lunch?.logged ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete
                  </span>
                ) : (
                  <button
                    onClick={() => handleLogMeal('lunch')}
                    className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    Log Lunch
                  </button>
                )}
              </div>

              {/* Dinner */}
              <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                wellness.meals?.dinner?.logged
                  ? 'bg-slate-50/80 border-slate-200/60'
                  : 'bg-amber-50/60 border-amber-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Dinner</span>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                      Threshold Window (07:30 - 09:30 PM)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {wellness.meals?.dinner?.logged
                      ? `Logged at ${wellness.meals.dinner.time} • ${wellness.meals.dinner.note || 'Dinner finished'}`
                      : 'Active now: Remember to pause and eat!'}
                  </p>
                </div>

                {wellness.meals?.dinner?.logged ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete
                  </span>
                ) : (
                  <button
                    onClick={() => handleLogMeal('dinner')}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm transition-all"
                  >
                    Log Dinner 🍲
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Consistent meals prevent fatigue during intense coding sprints.</span>
          </div>
        </div>
      </div>

      {/* Mindful Breathing & 20-20-20 Focus Companion */}
      <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] font-bold tracking-wider uppercase text-teal-300">
              Focus & Posture Companion
            </span>
            <h3 className="text-xl font-bold text-white">20-20-20 Eye Rest & Calming Breathwork</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every 20 minutes of continuous screen focus, look at an object 20 feet away for 20 seconds. Take 3 deep diaphragmatic breaths to reset your parasympathetic tone.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsBreathingActive(!isBreathingActive)}
                className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-md ${
                  isBreathingActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-500/20'
                }`}
              >
                {isBreathingActive ? 'Stop Breathing Guide' : 'Start 60s Calming Breath'}
              </button>

              <button
                onClick={handleTakeBreak}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/15"
              >
                Log Mindful Stretch 🧘
              </button>
            </div>
          </div>

          {/* Breathing Visualizer Circle */}
          <div className="flex flex-col items-center justify-center shrink-0 w-44 h-44 rounded-full bg-white/5 border border-white/10 relative">
            <div
              className={`w-28 h-28 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-400 transition-all duration-1000 flex items-center justify-center text-slate-950 font-bold text-xs text-center p-2 shadow-lg shadow-emerald-500/20 ${
                isBreathingActive ? 'scale-125 opacity-90' : 'scale-90 opacity-70'
              }`}
            >
              {isBreathingActive ? breathingPhase : 'Breathe Calm'}
            </div>
          </div>
        </div>
      </div>

      {/* Mood Check-In & 7-Day Consistency Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood & Energy State Selector */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Energy & Mindset Check-in</h3>
            <p className="text-xs text-slate-500">How are you feeling right now Alen? Hope logs this to adapt its tone.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'focused', label: 'Deep Focus', icon: Zap, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
              { id: 'calm', label: 'Calm & Centered', icon: Heart, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { id: 'energized', label: 'Energized', icon: Flame, color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { id: 'fatigued', label: 'A bit Tired', icon: Moon, color: 'text-slate-600 bg-slate-100 border-slate-200' },
              { id: 'stressed', label: 'Need a Pause', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' }
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = wellness.mood?.rating === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleMoodSelect(m.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? `${m.color} ring-2 ring-hope-500/30 font-bold shadow-sm`
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs truncate">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 flex items-center justify-between">
            <span>Current check-in logged: <strong>{wellness.mood?.label}</strong></span>
            <span className="text-[11px] text-slate-400">
              {wellness.mood?.loggedAt ? new Date(wellness.mood.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
            </span>
          </div>
        </div>

        {/* 7-Day Consistency History Trend */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Weekly Routine Consistency</h3>
                <p className="text-xs text-slate-500">7-day routine trend across water, meals, and focus</p>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl">
                92% Average
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2 pb-4">
              {history.map((dayItem, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <div className="w-full h-24 bg-slate-100 rounded-2xl flex flex-col justify-end p-1 overflow-hidden">
                    <div
                      className={`w-full rounded-xl transition-all ${
                        idx === 6 ? 'bg-hope-600' : 'bg-emerald-500'
                      }`}
                      style={{ height: `${dayItem.score}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold ${idx === 6 ? 'text-hope-700' : 'text-slate-500'}`}>
                    {dayItem.day}
                  </span>
                  <span className="text-[10px] text-slate-400">{dayItem.score}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              6 consecutive days achieving target routine
            </span>
            <span className="text-slate-400">Hope Guardian v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

