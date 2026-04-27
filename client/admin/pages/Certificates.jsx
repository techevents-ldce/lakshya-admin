import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineDocumentDownload, HiOutlineMail, HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi';

import { Step1MemberUpload } from '../components/CertificateSystem/Step1MemberUpload';
import { Step2TemplateUpload } from '../components/CertificateSystem/Step2TemplateUpload';
import { Step3FontUpload } from '../components/CertificateSystem/Step3FontUpload';
import { Step4CertificatePreview } from '../components/CertificateSystem/Step4CertificatePreview';
import { Step5EmailDelivery } from '../components/CertificateSystem/Step5EmailDelivery';
import { createZipFromCertificates } from '../components/CertificateSystem/utils/certificateGenerator';

export default function Certificates() {
  const [currentStep, setCurrentStep] = useState(1);
  const [members, setMembers] = useState([]);
  const [templateImage, setTemplateImage] = useState('');
  const [namePosition, setNamePosition] = useState({ x: 0, y: 0 });
  const [fontFamily, setFontFamily] = useState('Sephora & Hayden');
  const [certificateConfig, setCertificateConfig] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMembersLoaded = (loadedMembers) => {
    setMembers(loadedMembers);
    if (loadedMembers.length > 0) {
      toast.success(`${loadedMembers.length} members loaded successfully`);
      setCurrentStep(2);
    }
  };

  const handleTemplateLoaded = (imageData, position) => {
    setTemplateImage(imageData);
    setNamePosition(position);
    setCurrentStep(3);
  };

  const handleFontConfigured = (family, _file, config) => {
    setFontFamily(family);
    setCertificateConfig(config);
    setCurrentStep(4);
  };

  const handleCertificatesGenerated = (generatedCerts) => {
    setCertificates(generatedCerts);
    toast.success('All certificates generated successfully');
    setCurrentStep(5);
  };

  const handleDownloadAll = async () => {
    if (certificates.length === 0) return;
    setIsLoading(true);
    try {
      const zipBlob = await createZipFromCertificates(certificates);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificates_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ZIP download started');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create ZIP file');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return members.length > 0;
      case 2: return templateImage !== '' && namePosition.x !== 0;
      case 3: return fontFamily !== '' && certificateConfig !== null;
      case 4: return certificates.length > 0;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1MemberUpload onMembersLoaded={handleMembersLoaded} isLoading={isLoading} />;
      case 2:
        return <Step2TemplateUpload onTemplateLoaded={handleTemplateLoaded} isLoading={isLoading} />;
      case 3:
        return <Step3FontUpload 
          templateImage={templateImage} 
          namePosition={namePosition} 
          onFontConfigured={handleFontConfigured} 
          isLoading={isLoading} 
        />;
      case 4:
        return <Step4CertificatePreview 
          members={members} 
          config={certificateConfig} 
          fontFamily={fontFamily} 
          onCertificatesGenerated={handleCertificatesGenerated} 
          isLoading={isLoading} 
        />;
      case 5:
        return (
          <div className="space-y-6">
            <Step5EmailDelivery 
              members={members} 
              certificates={certificates} 
              isLoading={isLoading} 
            />
            <div className="flex justify-center mt-8">
              <button
                onClick={handleDownloadAll}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 shadow-xl"
              >
                <HiOutlineDocumentDownload className="w-5 h-5" />
                Download All as ZIP
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const steps = [
    { n: 1, label: 'Members', icon: HiOutlineCheckCircle },
    { n: 2, label: 'Template', icon: HiOutlineCheckCircle },
    { n: 3, label: 'Styling', icon: HiOutlineCheckCircle },
    { n: 4, label: 'Generate', icon: HiOutlineCheckCircle },
    { n: 5, label: 'Delivery', icon: HiOutlineMail },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              Auto Certificate <span className="text-indigo-400">System</span>
            </h1>
            <p className="text-slate-500 font-medium">Generate and deliver certificates to participants in bulk.</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
             <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <HiOutlineClock className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Active Step</p>
                <p className="text-sm font-bold text-white">Step {currentStep}: {steps[currentStep-1].label}</p>
             </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0"></div>
          <div className="flex justify-between relative z-10">
            {steps.map((step) => (
              <div 
                key={step.n} 
                className="flex flex-col items-center gap-3 cursor-pointer group"
                onClick={() => step.n < currentStep && setCurrentStep(step.n)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                  step.n === currentStep 
                    ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-110' 
                    : step.n < currentStep 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                }`}>
                  {step.n < currentStep ? '✓' : step.n}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  step.n === currentStep ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-md shadow-2xl min-h-[500px]">
          {renderStep()}
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || isLoading}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentStep === 1 
                ? 'text-slate-700 bg-transparent opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
             {steps.map(s => (
               <div key={s.n} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${s.n === currentStep ? 'w-6 bg-indigo-500' : s.n < currentStep ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
             ))}
          </div>

          <button
            onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
            disabled={currentStep === 5 || isLoading || !canProceed()}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
              !canProceed() || currentStep === 5
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {currentStep === 4 ? 'Confirm & Go to Delivery →' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
}
