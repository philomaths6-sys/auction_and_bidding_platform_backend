import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { auctionService } from '../services/api/auctionService';
import { CheckCircle2, ChevronRight, Image as ImageIcon, Plus, X, UploadCloud, Info, Bold, Italic, List, ChevronLeft, Loader2 } from 'lucide-react';
import AuctionCard from '../components/AuctionCard';
import { useCategories } from '../context/CategoryContext';
import { formatApiError } from '../utils/apiError';

function parseLocalDateTime(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function EditAuction() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const { categoryRoots } = useCategories();
  
  const [step, setStep] = useState(1); // 1 to 4
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
    if (!id) return;
    loadAuctionData();
  }, [id]);

  const loadAuctionData = async () => {
    try {
      setLoading(true);
      const auction = await auctionService.getAuction(id);
      
      // Verify user owns this auction
      if (auction.seller_id !== user.id) {
        addToast('You can only edit your own auctions', 'error');
        navigate('/dashboard');
        return;
      }
      
      // Allow editing of both draft and active auctions
      if (auction.auction_status !== 'draft' && auction.auction_status !== 'active') {
        addToast('You can only edit draft and active auctions', 'error');
        navigate('/dashboard');
        return;
      }
      
      // Load form data
      setFormData({
        title: auction.title || '',
        category_id: auction.category_id || '',
        description: auction.description || '',
        starting_price: auction.starting_price || '',
        reserve_price: auction.reserve_price || '',
        end_time: auction.end_time ? new Date(auction.end_time).toISOString().slice(0, 16) : '',
        images: auction.images || [],
        attributes: auction.attributes || []
      });
      
      // Set parent category if exists
      if (auction.category_id) {
        const parent = categoryRoots.find(cat => 
          cat.id === auction.category_id || 
          cat.children?.some(child => child.id === auction.category_id)
        );
        if (parent) {
          setParentCategoryId(parent.id.toString());
        }
      }
      
    } catch (error) {
      addToast(formatApiError(error, 'Failed to load auction data'), 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const safeRoots = Array.isArray(categoryRoots) ? categoryRoots : [];
  const selectedParent = safeRoots.find((c) => c.id === Number(parentCategoryId));
  const availableSubcategories = selectedParent?.children?.length ? selectedParent.children : (selectedParent ? [selectedParent] : []);

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addImageUrl = () => {
    if (imageUrlInput.trim()) {
      updateFormData('images', [...formData.images, { 
        image_url: imageUrlInput.trim(), 
        is_primary: formData.images.length === 0 
      }]);
      setImageUrlInput('');
    }
  };

  const removeImage = (index) => {
    const updated = formData.images.filter((_, i) => i !== index);
    // If we removed the primary, make the first one primary
    if (updated.length > 0 && !updated.some(img => img.is_primary)) {
      updated[0].is_primary = true;
    }
    updateFormData('images', updated);
  };

  const setPrimaryImage = (index) => {
    const updated = formData.images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    updateFormData('images', updated);
  };

  const addAttributeGroup = () => {
    const names = attrNameGroup.split(',').map(n => n.trim()).filter(Boolean);
    const values = attrValGroup.split(',').map(v => v.trim()).filter(Boolean);
    const pairs = [];
    
    for (let i = 0; i < Math.max(names.length, values.length); i++) {
      if (names[i] || values[i]) {
        pairs.push({
          attribute_name: names[i] || `Attribute ${formData.attributes.length + i + 1}`,
          attribute_value: values[i] || ''
        });
      }
    }
    
    if (pairs.length > 0) {
      updateFormData('attributes', [...formData.attributes, ...pairs]);
      setAttrNameGroup('');
      setAttrValGroup('');
    }
  };

  const removeAttribute = (index) => {
    updateFormData('attributes', formData.attributes.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) { addToast('Title is required', 'error'); return false; }
        if (!formData.category_id) { addToast('Category is required', 'error'); return false; }
        if (!formData.description.trim()) { addToast('Description is required', 'error'); return false; }
        return true;
      case 2:
        if (!formData.starting_price || parseFloat(formData.starting_price) <= 0) {
          addToast('Starting price must be greater than 0', 'error'); return false;
        }
        if (formData.reserve_price && parseFloat(formData.reserve_price) <= parseFloat(formData.starting_price)) {
          addToast('Reserve price must be greater than starting price', 'error'); return false;
        }
        if (!formData.end_time) { addToast('End time is required', 'error'); return false; }
        if (new Date(formData.end_time) <= new Date()) { addToast('End time must be in the future', 'error'); return false; }
        return true;
      case 3:
        if (formData.images.length === 0) { addToast('At least one image is required', 'error'); return false; }
        return true;
      case 4:
        return true; // Attributes are optional
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    try {
      setSubmitting(true);
      
      const submitData = {
        ...formData,
        starting_price: parseFloat(formData.starting_price),
        reserve_price: formData.reserve_price ? parseFloat(formData.reserve_price) : null,
        end_time: new Date(formData.end_time).toISOString(),
        images: formData.images.map(img => ({
          image_url: img.image_url,
          is_primary: img.is_primary
        })),
        attributes: formData.attributes
      };
      
      await auctionService.updateAuction(id, submitData);
      addToast('Auction updated successfully!', 'success');
      navigate('/dashboard');
      
    } catch (error) {
      addToast(formatApiError(error, 'Failed to update auction'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-black tracking-tight">Edit Auction</h1>
          <p className="text-slate-400 mt-2">Update your auction details (draft and active auctions supported)</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                s <= step ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400'
              }`}>
                {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-16 h-1 mx-2 transition-colors ${
                  s < step ? 'bg-amber-500' : 'bg-slate-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                placeholder="Enter auction title"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Category *</label>
              <select
                value={parentCategoryId}
                onChange={(e) => setParentCategoryId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select parent category</option>
                {categoryRoots.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {availableSubcategories.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Subcategory</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => updateFormData('category_id', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select subcategory</option>
                  {availableSubcategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={6}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 resize-none"
                placeholder="Describe your item in detail..."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Starting Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.starting_price}
                onChange={(e) => updateFormData('starting_price', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Reserve Price (Optional)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.reserve_price}
                onChange={(e) => updateFormData('reserve_price', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                placeholder="0.00"
              />
              <p className="text-xs text-slate-400 mt-1">Minimum price you're willing to accept</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Auction End Time *</label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => updateFormData('end_time', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-xs text-slate-400 mt-1">End time must be at least 2-3 hours into the future</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Images *</label>
              <div className="flex gap-2 mb-4">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Enter image URL"
                />
                <button
                  onClick={addImageUrl}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-3 rounded-lg font-bold transition-colors"
                >
                  Add
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.image_url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPrimaryImage(index)}
                        className={`px-2 py-1 text-xs rounded ${img.is_primary ? 'bg-amber-500' : 'bg-slate-700'}`}
                      >
                        {img.is_primary ? 'Primary' : 'Set Primary'}
                      </button>
                      <button
                        onClick={() => removeImage(index)}
                        className="px-2 py-1 text-xs bg-red-600 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Attributes (Optional)</label>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={attrNameGroup}
                    onChange={(e) => setAttrNameGroup(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Names (comma separated)"
                  />
                  <input
                    type="text"
                    value={attrValGroup}
                    onChange={(e) => setAttrValGroup(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Values (comma separated)"
                  />
                  <button
                    onClick={addAttributeGroup}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-3 rounded-lg font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                <div className="space-y-2">
                  {formData.attributes.map((attr, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
                      <div>
                        <span className="font-bold text-amber-500">{attr.attribute_name}:</span>
                        <span className="ml-2">{attr.attribute_value}</span>
                      </div>
                      <button
                        onClick={() => removeAttribute(index)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={step === 1 ? () => navigate('/dashboard') : handlePrev}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>
          
          <div className="flex gap-2">
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
