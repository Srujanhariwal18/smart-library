import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { CreditCard, Download, Printer, QrCode, User, Hash } from 'lucide-react';
import QRCode from 'qrcode';

const LibraryCard = () => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [cardId] = useState(() => {
    // Use Clerk user ID if available, otherwise generate a stable ID from user data
    const storedId = localStorage.getItem(`lib_card_id_${user?.id}`);
    if (storedId) return storedId;
    const newId = user?.id
      ? `SMLIB-${String(user.id).padStart(6, '0')}`
      : `SMLIB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    if (user?.id) localStorage.setItem(`lib_card_id_${user.id}`, newId);
    return newId;
  });

  useEffect(() => {
    if (!user) return;
    const qrPayload = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cardId,
      issued: new Date().toISOString().split('T')[0]
    });

    QRCode.toDataURL(qrPayload, {
      width: 200,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' }
    }).then(setQrDataUrl).catch(console.error);
  }, [user, cardId]);

  if (!user) return null;

  const handlePrint = () => window.print();

  const roleColors = {
    student: 'from-indigo-600 via-purple-600 to-blue-600',
    teacher: 'from-emerald-600 via-teal-600 to-cyan-600',
    librarian: 'from-amber-500 via-orange-500 to-red-500',
    admin: 'from-rose-600 via-pink-600 to-fuchsia-600',
  };

  const gradientClass = roleColors[user.role] || roleColors.student;
  const joinYear = new Date(user.created_at || Date.now()).getFullYear();
  const expiryYear = joinYear + 4;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <CreditCard className="text-primary-500" />
          Digital Library Card
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Your personal smart library identification card with QR code for in-campus access.
        </p>
      </div>

      {/* Card Preview + Actions */}
      <div className="flex flex-col lg:flex-row gap-10 items-start">

        {/* The Printable Card */}
        <div id="library-card-print" className="flex-shrink-0">
          {/* Card Face */}
          <div
            className={`relative w-[380px] h-[220px] rounded-2xl bg-gradient-to-br ${gradientClass} shadow-2xl overflow-hidden select-none`}
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Background decorative circles */}
            <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

            {/* Card Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-between">
              {/* Top Row: Institution + Logo */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-[9px] font-extrabold uppercase tracking-[0.2em]">Smart Library</p>
                  <p className="text-white font-black text-sm tracking-wide leading-tight">College Management System</p>
                  <p className="text-white/60 text-[9px] mt-0.5 font-semibold uppercase tracking-widest">Student Identification Card</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                  <QrCode size={22} className="text-white" />
                </div>
              </div>

              {/* Middle: Name + Details */}
              <div className="flex items-end justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-0.5">Card Holder</p>
                  <p className="text-white font-black text-lg leading-tight truncate">{user.name}</p>
                  <p className="text-white/70 text-[10px] font-semibold truncate mt-0.5">{user.email}</p>

                  <div className="flex items-center gap-3 mt-3">
                    <div>
                      <p className="text-white/50 text-[8px] font-bold uppercase tracking-wider">Card ID</p>
                      <p className="text-white font-black text-[10px] tracking-widest">{cardId}</p>
                    </div>
                    <div className="w-px h-6 bg-white/30" />
                    <div>
                      <p className="text-white/50 text-[8px] font-bold uppercase tracking-wider">Valid Until</p>
                      <p className="text-white font-black text-[10px]">{expiryYear}</p>
                    </div>
                    <div className="w-px h-6 bg-white/30" />
                    <div>
                      <p className="text-white/50 text-[8px] font-bold uppercase tracking-wider">Role</p>
                      <p className="text-white font-black text-[10px] uppercase">{user.role}</p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                {qrDataUrl && (
                  <div className="ml-4 bg-white p-1.5 rounded-xl shadow-lg shrink-0">
                    <img src={qrDataUrl} alt="Library Card QR Code" className="w-16 h-16 rounded" />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom stripe */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30" />
          </div>

          {/* Card Back Hint */}
          <p className="text-xs text-slate-400 text-center mt-2">This card is digitally verified and bound to your account.</p>
        </div>

        {/* Card Info Panel */}
        <div className="flex-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <User size={16} className="text-primary-500" />
              Card Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Full Name</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Role</p>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary-100 text-primary-800 dark:bg-primary-950/40 dark:text-primary-400">
                  {user.role}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Card ID</p>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">{cardId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Valid Until</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Dec 31, {expiryYear}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered Email</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{user.email}</p>
              </div>
            </div>
          </div>

          {/* QR Code Info */}
          <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl p-4 text-sm">
            <p className="text-indigo-800 dark:text-indigo-300 font-semibold text-xs flex items-center gap-1.5 mb-1">
              <Hash size={12} />
              About Your QR Code
            </p>
            <p className="text-indigo-700 dark:text-indigo-400 text-xs leading-relaxed">
              Your QR code encodes your unique library identity — name, email, role, and card ID. 
              Librarians can scan it at the circulation desk for quick access.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all"
            >
              <Printer size={16} />
              Print Card
            </button>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`library-card-${cardId}.png`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow transition-all"
              >
                <Download size={16} />
                Download QR
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #library-card-print { display: block !important; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
};

export default LibraryCard;
