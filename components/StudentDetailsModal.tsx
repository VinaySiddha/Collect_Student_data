'use client';

import { StudentRecord } from '@/lib/types';
import { FiX, FiMail, FiPhone, FiCalendar, FiMapPin, FiDownload, FiUser } from 'react-icons/fi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface StudentDetailsModalProps {
  student: StudentRecord | null;
  onClose: () => void;
}

export default function StudentDetailsModal({ student, onClose }: StudentDetailsModalProps) {
  if (!student) return null;

  const exportIDCard = async () => {
    const element = document.getElementById('id-card-render-area');
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 4,
      backgroundColor: null,
      logging: false,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [240, 380]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 240, 380);
    pdf.save(`${student.name.replace(/\s+/g, '_')}_Official_ID.pdf`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl my-4 sm:my-8 bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-200">

        {/* Close button — always visible at top-right of modal */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-300 shadow-sm"
        >
          <FiX className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr]">

          {/* ID Card Visual Preview */}
          <div className="bg-slate-50 p-5 sm:p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
            <div
              id="id-card-render-area"
              className="w-[200px] h-[320px] sm:w-[220px] sm:h-[350px] bg-white rounded-[1.25rem] shadow-xl relative overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="h-20 sm:h-24 bg-slate-900 flex flex-col items-center justify-center p-3 sm:p-4 text-center">
                <p className="text-[0.5rem] font-black uppercase tracking-[0.3em] text-cyan-400 mb-1">Identity Card</p>
                <h4 className="text-[0.65rem] font-bold text-white leading-tight uppercase line-clamp-2 px-2">{student.college}</h4>
              </div>

              <div className="flex-1 flex flex-col items-center pt-6 sm:pt-8 px-4 sm:px-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-slate-100">
                  {student.photo ? (
                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[0.6rem] text-slate-300 font-black uppercase">No Photo</div>
                  )}
                </div>

                <div className="mt-4 sm:mt-6 text-center">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">{student.name}</h3>
                  <p className="text-[0.6rem] font-bold text-cyan-600 uppercase tracking-widest mt-1">{student.course}</p>
                </div>

                <div className="mt-auto mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 w-full border-t border-slate-50 pt-4 sm:pt-6">
                  <div className="text-center">
                    <p className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">Student ID</p>
                    <p className="text-[0.65rem] font-black text-slate-900">{student.studentId}</p>
                  </div>
                  <div className="text-center border-l border-slate-50">
                    <p className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">Year</p>
                    <p className="text-[0.65rem] font-black text-slate-900">{student.year}</p>
                  </div>
                </div>
              </div>

              <div className="h-8 sm:h-10 bg-slate-50 flex items-center justify-center border-t border-slate-100">
                <div className="flex gap-[1px] h-3 sm:h-4 opacity-40">
                  {[...Array(26)].map((_, i) => (
                    <div key={i} className="bg-slate-900" style={{ width: `${Math.random() * 2 + 1}px` }}></div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={exportIDCard}
              className="mt-5 sm:mt-8 group flex items-center justify-center gap-2 sm:gap-3 bg-slate-900 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-green-600 transition-all duration-300 shadow-lg active:scale-95"
            >
              <FiDownload className="w-4 h-4" /> Download ID Card
            </button>
          </div>

          {/* Student Details */}
          <div className="p-5 sm:p-8 lg:p-10 flex flex-col">
            <div className="mb-6 sm:mb-8 pr-8 sm:pr-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Student Details</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest">Record Profile</p>
            </div>

            <div className="grid gap-5 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                  <FiMail className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.2em]">Email Address</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800 truncate">{student.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                  <FiPhone className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.2em]">Phone Number</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800">{student.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                  <FiMapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.2em]">College</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800 truncate">{student.college}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                  <FiCalendar className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.2em]">Record Date</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800">{new Date(student.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-auto pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                  <FiUser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <p className="text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Last Modified by: {student.createdBy || 'Administrator'}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.98) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-up {
          animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
