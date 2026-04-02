import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { auctionService } from '../services/api/auctionService';
import { CheckCircle2, ChevronRight, Image as ImageIcon, Plus, X, UploadCloud, Info, Bold, Italic, List, ChevronLeft } from 'lucide-react';
import AuctionCard from '../components/AuctionCard';
import { useCategories } from '../context/CategoryContext';
import { formatApiError } from '../utils/apiError';

function parseLocalDateTime(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function CreateAuction() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { categoryRoots } = useCategories();
  
  const [step, setStep] = useState(1); // 1 to 4
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '', category_id: '', description: '',
    starting_price: '', reserve_price: '', end_time: '',
    images: [], attributes: []
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [attrNameGroup, setAttrNameGroup] = useState('');
  const [attrValGroup, setAttrValGroup] = useState('');

  useEffect(() => {
    // Set default end_time to +3 hours
    const d = new Date();
    d.setHours(d.getHours() + 3);
    setFormData(prev => ({ ...prev, end_time: d.toISOString().slice(0, 16) }));
  }, [user, navigate]);

  const safeRoots = Array.isArray(categoryRoots) ? categoryRoots : [];
  const selectedParent = safeRoots.find((c) => c.id === Number(parentCategoryId));
  const availableSubcategories = selectedParent?.children?.length ? selectedParent.children : (selectedParent ? [selectedParent] : []);

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const addImageUrl = () => {
    if (!imageUrlInput) return;
    setFormData(prev => ({ 
      ...prev, 
      images: [...prev.images, { url: imageUrlInput, is_primary: prev.images.length === 0 }] 
    }));
    setImageUrlInput('');
  };

  const removeImage = (idx) => {
    setFormData(prev => {
      const newImgs = [...prev.images];
      newImgs.splice(idx, 1);
      if (newImgs.length > 0 && !newImgs.some(i => i.is_primary)) newImgs[0].is_primary = true;
      return { ...prev, images: newImgs };
    });
  };

  const setPrimaryImage = (idx) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, is_primary: i === idx }))
    }));
  };

  const addAttribute = () => {
    if (!attrNameGroup || !attrValGroup) return;
    setFormData(prev => ({
      ...prev, attributes: [...prev.attributes, { attribute_name: attrNameGroup, attribute_value: attrValGroup }]
    }));
    setAttrNameGroup(''); setAttrValGroup('');
  };

  const removeAttribute = (idx) => {
    setFormData(prev => ({
      ...prev, attributes: prev.attributes.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== 4) return handleNext();

    const title = formData.title.trim();
    const description = formData.description.trim();
    const categoryId = parseInt(formData.category_id, 10);
    const starting = parseFloat(formData.starting_price);
    const end = parseLocalDateTime(formData.end_time);

    if (!title) {
      addToast('Please enter an auction title.', 'error');
      return;
    }
    if (title.length > 255) {
      addToast('Title must be at most 255 characters.', 'error');
      return;
    }
    if (!Number.isFinite(categoryId) || categoryId < 1) {
      addToast('Please select a parent category and subcategory.', 'error');
      return;
    }
    if (!description) {
      addToast('Please enter a description.', 'error');
      return;
    }
    if (!Number.isFinite(starting) || starting < 1) {
      addToast('Starting price must be at least $1.', 'error');
      return;
    }
    if (!end) {
      addToast('Please choose a valid auction end date and time.', 'error');
      return;
    }
    if (end <= new Date()) {
      addToast('End time must be in the future.', 'error');
      return;
    }

    // Validate images
    if (!formData.images || formData.images.length === 0) {
      addToast('Please add at least one image.', 'error');
      return;
    }

    let reserve = null;
    if (formData.reserve_price !== '' && formData.reserve_price != null) {
      reserve = parseFloat(formData.reserve_price);
      if (!Number.isFinite(reserve) || reserve < 0) {
        addToast('Reserve price must be a valid number (0 or greater).', 'error');
        return;
      }
      if (reserve > 0 && reserve < starting) {
        addToast('Reserve price cannot be less than the starting price.', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        starting_price: starting,
        end_time: end.toISOString(),
        category_id: categoryId,
      };
      if (reserve != null && Number.isFinite(reserve)) {
        payload.reserve_price = reserve;
      }

      const newAuction = await auctionService.createAuction(payload);

      // Upload Images
      for (const img of formData.images) {
        try {
          await auctionService.addImage(newAuction.id, { image_url: img.url, is_primary: img.is_primary });
        } catch (imgErr) {
          console.error('Image upload failed:', imgErr);
        }
      }

      // Upload Attributes
      for (const attr of formData.attributes) {
        try {
          await auctionService.addAttribute(newAuction.id, { attribute_name: attr.attribute_name, attribute_value: attr.attribute_value });
        } catch (attrErr) {
          console.error('Attribute upload failed:', attrErr);
        }
      }
      
      addToast('Auction created successfully!', 'success');
      navigate(`/auctions/${newAuction.id}`);
    } catch (err) {
      addToast(formatApiError(err, 'Failed to create auction'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndicators = [
    { num: 1, label: "Basic Info" },
    { num: 2, label: "Pricing & Schedule" },
    { num: 3, label: "Media Gallery" },
    { num: 4, label: "Attributes" }
  ];

  const previewEndIso = (() => {
    const d = parseLocalDateTime(formData.end_time);
    return d ? d.toISOString() : new Date().toISOString();
  })();

  // Live Preview Object mapped to standard AuctionCard format
  const previewCat = availableSubcategories.find((c) => c.id === Number(formData.category_id));
  const mockPreviewObj = {
    id: 9999,
    title: formData.title || 'Untitled Auction',
    description: formData.description || 'Description will appear here.',
    current_price: Number.isFinite(parseFloat(formData.starting_price))
      ? parseFloat(formData.starting_price)
      : 0,
    category_id: Number.isFinite(parseInt(formData.category_id, 10))
      ? parseInt(formData.category_id, 10)
      : null,
    category_name: previewCat?.name || null,
    seller_id: user?.id ?? 0,
    seller_username: user?.username || null,
    end_time: previewEndIso,
    images: formData.images.map(img => ({ image_url: img.url, is_primary: img.is_primary })),
    total_bids: 0,
    total_views: 0,
    auction_status: 'active'
  };

  return (
    <div className="py-8 font-sans px-4 lg:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Create Listing</h1>
        
        {/* Progress Tracker */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
          {stepIndicators.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                step === s.num ? 'bg-amber-500 text-amber-950 font-black' : 
                step > s.num ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500 font-bold' : 
                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-bold'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 flex items-center justify-center bg-white/30 rounded-full text-xs">{s.num}</span>}
                <span className="uppercase tracking-widest text-xs">{s.label}</span>
              </div>
              {idx < 3 && <div className={`w-8 h-1 rounded flex-shrink-0 transition-colors ${step > s.num ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-800'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* LEFT PANEL - FORM STEPS */}
        <div className="lg:w-1/2">
          <form onSubmit={handleSubmit} className="glass border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
            
            {/* STEP 1: BASIC INFO */}
            <div className={`space-y-6 animate-in slide-in-from-right-4 duration-300 ${step !== 1 && 'hidden'}`}>
              <div>
                <label className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <span>Auction Title</span>
                  <span className={formData.title.length > 255 ? 'text-red-500' : ''}>{formData.title.length}/255</span>
                </label>
                <input type="text" required={step===1} maxLength={255} value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full glass-input border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-semibold text-lg focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white transition-colors" placeholder="e.g. 1969 Ford Mustang Boss 429" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Parent Category</label>
                <select required={step===1} value={parentCategoryId} onChange={e => {
                  setParentCategoryId(e.target.value);
                  setFormData({...formData, category_id: ''});
                }} className="w-full glass-input border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-bold focus:outline-none focus:border-amber-500 transition-colors">
                  <option value="">Select parent category...</option>
                  {safeRoots.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Subcategory</label>
                <select required={step===1} value={formData.category_id} onChange={e=>setFormData({...formData, category_id: e.target.value})} className="w-full glass-input border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-bold focus:outline-none focus:border-amber-500 transition-colors">
                  <option value="">Select subcategory...</option>
                  {availableSubcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Detailed Description</label>
                <div className="glass border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col focus-within:border-amber-500 transition-colors">
                  <div className="glass-soft p-2 flex gap-2 border-b border-slate-200 dark:border-slate-800">
                    <button type="button" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"><Bold className="w-4 h-4" /></button>
                    <button type="button" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"><Italic className="w-4 h-4" /></button>
                    <button type="button" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"><List className="w-4 h-4" /></button>
                  </div>
                  <textarea required={step===1} rows="6" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full glass-input px-4 py-3 font-medium focus:outline-none resize-y" placeholder="Detail the condition, history, and modifications..."></textarea>
                </div>
              </div>
            </div>

            {/* STEP 2: PRICING */}
            <div className={`space-y-6 animate-in slide-in-from-right-4 duration-300 ${step !== 2 && 'hidden'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Starting Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">$</span>
                    <input type="number" required={step===2} min="1" value={formData.starting_price} onChange={e=>setFormData({...formData, starting_price: e.target.value})} className="w-full glass-input border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-4 py-3 font-mono font-black text-xl focus:outline-none focus:border-amber-500 transition-colors" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1 block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 group cursor-help">
                    Reserve Price <span title="Hidden from bidders until met"><Info className="w-3 h-3 text-amber-500" /></span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">$</span>
                    <input type="number" min="0" value={formData.reserve_price} onChange={e=>setFormData({...formData, reserve_price: e.target.value})} className="w-full glass-input border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-4 py-3 font-mono text-xl focus:outline-none focus:border-amber-500 transition-colors" placeholder="Optional" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Auction End Time</label>
                <input type="datetime-local" required={step===2} value={formData.end_time} onChange={e=>setFormData({...formData, end_time: e.target.value})} className="w-full glass-input border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-mono font-bold focus:outline-none focus:border-amber-500 transition-colors" />
                <p className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1"><Info className="w-3 h-3" /> Ensure end time is at least 2-3 hours into the future.</p>
              </div>
            </div>

            {/* STEP 3: IMAGES */}
            <div className={`space-y-6 animate-in slide-in-from-right-4 duration-300 ${step !== 3 && 'hidden'}`}>
              <div className="glass border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors">
                <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-900 dark:text-white font-black uppercase tracking-tight mb-2">Drag & Drop Image URLs (Simulated)</p>
                <p className="text-slate-500 font-medium text-sm max-w-[250px] mx-auto">Upload via URL string format. First linked image acts as primary cover.</p>
                
                <div className="flex gap-2 mt-6 max-w-sm mx-auto">
                  <input type="url" value={imageUrlInput} onChange={e=>setImageUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImageUrl())} placeholder="https://example.com/img.jpg" className="flex-grow glass-input border border-slate-200 dark:border-slate-800 rounded px-3 text-sm focus:outline-none focus:border-amber-500" />
                  <button type="button" onClick={addImageUrl} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 font-black uppercase tracking-widest text-xs rounded transition-transform hover:scale-105">Add</button>
                </div>
              </div>
              
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className={`relative aspect-square rounded-lg overflow-hidden border-2 group ${img.is_primary ? 'border-amber-500 shadow-lg' : 'border-slate-200 dark:border-slate-800'}`}>
                      <img src={img.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2">
                        {!img.is_primary && <button type="button" onClick={() => setPrimaryImage(idx)} className="text-xs font-black uppercase tracking-widest text-amber-500 bg-black/80 px-2 py-1 rounded hover:bg-amber-500 hover:text-black transition-colors">Make Cover</button>}
                        <button type="button" onClick={() => removeImage(idx)} className="text-xs font-black uppercase tracking-widest text-white bg-red-600 px-2 py-1 rounded shadow hover:bg-red-500">Delete</button>
                      </div>
                      {img.is_primary && <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow">Primary</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 4: ATTRIBUTES */}
            <div className={`space-y-6 animate-in slide-in-from-right-4 duration-300 ${step !== 4 && 'hidden'}`}>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Dynamic Specs Grid</h3>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <input type="text" value={attrNameGroup} onChange={e=>setAttrNameGroup(e.target.value)} placeholder="Spec Name (e.g. Engine)" className="flex-1 glass-input border border-slate-200 dark:border-slate-800 rounded px-4 py-2 text-sm font-bold focus:outline-none focus:border-amber-500" />
                  <input type="text" value={attrValGroup} onChange={e=>setAttrValGroup(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttribute())} placeholder="Value (e.g. 5.0L V8)" className="flex-[2] glass-input border border-slate-200 dark:border-slate-800 rounded px-4 py-2 text-sm font-medium focus:outline-none focus:border-amber-500" />
                  <button type="button" onClick={addAttribute} className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 p-2 rounded hover:bg-amber-500 hover:text-white transition-colors"><Plus className="w-5 h-5"/></button>
                </div>

                <div className="space-y-2">
                  {formData.attributes.map((attr, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 glass-soft border border-slate-200 dark:border-slate-800 rounded">
                      <div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 mr-4 w-24 inline-block">{attr.attribute_name}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{attr.attribute_value}</span>
                      </div>
                      <button type="button" onClick={() => removeAttribute(idx)} className="text-red-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                    </div>
                  ))}
                  {formData.attributes.length === 0 && <p className="text-center py-6 text-sm font-bold text-slate-400 uppercase tracking-widest border border-dashed border-slate-300 dark:border-slate-700 rounded">No attributes added.</p>}
                </div>
              </div>
            </div>

            {/* Form Footer Actions */}
            <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-200 dark:border-slate-800">
              <button 
                type="button" 
                onClick={handlePrev} 
                disabled={step === 1}
                className="flex items-center gap-2 px-6 py-3 font-black uppercase tracking-widest text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              
              <button 
                type="button" 
                onClick={step === 4 ? handleSubmit : handleNext}
                disabled={submitting}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm transition-transform hover:scale-105 disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                {step === 4 ? (submitting ? 'Publishing...' : 'Publish Listing') : 'Next Step'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT PANEL - LIVE PREVIEW */}
        <div className="hidden lg:block lg:w-1/2">
          <div className="sticky top-24 glass border border-slate-200 dark:border-slate-800 rounded-xl p-8 h-full min-h-[600px]">
            <div className="flex items-center gap-2 text-slate-400 mb-6 font-black uppercase tracking-widest text-xs border-b border-slate-200 dark:border-slate-800 pb-4">
              <ImageIcon className="w-4 h-4" /> Live Card Preview
            </div>

            <div className="opacity-90 max-w-sm mx-auto pointer-events-none">
              <AuctionCard auction={mockPreviewObj} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
