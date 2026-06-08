
import React, { useState, useMemo } from 'react';
import { useData } from '../../store';
import { Product, ProductCategory } from '../../types';
import { Package, Edit3, Trash2, X, Plus, ShoppingCart, Tag, FileSpreadsheet, Calendar, Download, Layers, Check, PlusCircle, CheckSquare, Square } from 'lucide-react';
import BulkImportModal from '../../components/BulkImportModal';
import HelpTooltip from '../../components/HelpTooltip';
import ConfirmModal from '../../components/ConfirmModal';
import * as XLSX from 'xlsx';

const CategoryModal: React.FC<{
  category?: ProductCategory | null;
  onClose: () => void;
  onSave: (data: Partial<ProductCategory>) => void;
}> = ({ category, onClose, onSave }) => {
  const [name, setName] = useState(category?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase">Categoria</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Categoria *</label>
            <input required autoFocus className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl">Salvar Categoria</button>
        </form>
      </div>
    </div>
  );
};

const ProductModal: React.FC<{
  product?: Product | null;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
}> = ({ product, onClose, onSave }) => {
  const { productCategories } = useData();
  const [formData, setFormData] = useState<Partial<Product>>(product || { name: '', categoryId: '' });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase">Produto</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Nome do Item * <HelpTooltip text="Nome comercial do produto ou serviço. Ex: 'Convite Digital', 'Álbum Executivo'. Aparece nas negociações e no perfil do cliente." /></label>
            <input
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Categoria * <HelpTooltip text="Agrupa produtos por tipo (Ex: Fotografia, Decoração, Convites). Usado nos filtros do Catálogo e nos relatórios de vendas." /></label>
            <select 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-amber-500"
              value={formData.categoryId}
              onChange={e => setFormData({...formData, categoryId: e.target.value})}
            >
              <option value="">Selecionar Categoria...</option>
              {productCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl mt-4">Salvar Produto</button>
        </form>
      </div>
    </div>
  );
};

const ProdutosAdmin: React.FC = () => {
  const { products, setProducts, productCategories, setProductCategories, addProduct, updateProduct, deleteProduct, addProductCategory, updateProductCategory, moveToTrash } = useData();
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [selectedProdId, setSelectedProdId] = useState<string | null>(null);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [selectedProdIds, setSelectedProdIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());

  const toggleSelectProd = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProdIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectCat = (id: string) => {
    setSelectedCatIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAllProds = () => setSelectedProdIds(prev =>
    prev.size === sortedProducts.length ? new Set() : new Set(sortedProducts.map(p => p.id))
  );
  const toggleSelectAllCats = () => setSelectedCatIds(prev =>
    prev.size === productCategories.length ? new Set() : new Set(productCategories.map(c => c.id))
  );
  const handleBulkDeleteProds = () => {
    if (!selectedProdIds.size) return;
    const ids = [...selectedProdIds];
    setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} produto(s) para a Lixeira?`, onConfirm: () => { moveToTrash('product', ids); setSelectedProdIds(new Set()); setSelectedProdId(null); setConfirmConfig(null); } });
  };
  const handleBulkDeleteCats = () => {
    if (!selectedCatIds.size) return;
    const ids = [...selectedCatIds];
    setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} categoria(s) para a Lixeira?`, onConfirm: () => { moveToTrash('productCategory', ids); setSelectedCatIds(new Set()); setConfirmConfig(null); } });
  };

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const selectedProd = useMemo(() => products.find(p => p.id === selectedProdId), [products, selectedProdId]);

  const handleExportXLS = () => {
    const exportData = products.map(p => {
        const cat = productCategories.find(c => c.id === p.categoryId);
        return {
            "ID": p.id,
            "Produto": p.name,
            "Categoria": cat?.name || 'Sem Categoria',
            "Data Cadastro": new Date(p.createdAt).toLocaleDateString('pt-BR')
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
    XLSX.writeFile(workbook, `produtos_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSaveProduct = (data: Partial<Product>) => {
    if (itemToEdit) {
      updateProduct({ ...itemToEdit, ...data } as Product);
    } else {
      addProduct(data as Omit<Product, 'id' | 'createdAt'>);
    }
    setProdModalOpen(false);
  };

  const handleSaveCategory = (data: Partial<ProductCategory>) => {
    if (itemToEdit) {
      updateProductCategory({ ...itemToEdit, ...data } as ProductCategory);
    } else {
      addProductCategory(data as Omit<ProductCategory, 'id' | 'createdAt'>);
    }
    setCatModalOpen(false);
  };

  const handleBulkImport = async (data: any[]) => {
    for (const item of data) {
      // Aguarda persistência — evita sobrecarga paralela no Supabase
      await addProduct({
        name: item.name,
        categoryId: item.categoryId || productCategories[0]?.id || '',
      });
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Catálogo de Vendas</h1>
          <p className="text-slate-500 font-medium">Gestão centralizada de itens e categorias comerciais.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={handleExportXLS} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-2">
              <Download size={18} /> Exportar Catálogo
           </button>
           <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
              <FileSpreadsheet size={18} /> Importar Planilha
           </button>
           <button 
             onClick={() => { setItemToEdit(null); activeTab === 'products' ? setProdModalOpen(true) : setCatModalOpen(true); }} 
             className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2"
           >
             <Plus size={18} /> {activeTab === 'products' ? 'Novo Produto' : 'Nova Categoria'}
           </button>
        </div>
      </div>

      <div className="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-sm self-start mb-2">
        <button 
          onClick={() => setActiveTab('products')}
          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <ShoppingCart size={16}/> Itens do Catálogo
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Layers size={16}/> Gerenciar Categorias
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-hidden">
          {activeTab === 'products' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto pb-10">
               {sortedProducts.map(prod => {
                 const cat = productCategories.find(c => c.id === prod.categoryId);
                 return (
                   <div
                     key={prod.id}
                     onClick={() => setSelectedProdId(prev => prev === prod.id ? null : prod.id)}
                     className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all bg-white relative group ${selectedProdId === prod.id ? 'border-amber-500 shadow-2xl scale-[1.02]' : selectedProdIds.has(prod.id) ? 'border-rose-400 shadow-lg' : 'border-white hover:border-slate-200 shadow-sm'}`}
                   >
                     <button onClick={(e) => toggleSelectProd(prod.id, e)} className={`absolute top-3 left-3 p-1 rounded-lg transition-all z-10 ${selectedProdIds.has(prod.id) ? 'text-rose-500' : 'text-slate-200 opacity-0 group-hover:opacity-100'}`}>
                       {selectedProdIds.has(prod.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                     </button>
                     <div className="flex justify-between items-start mb-4">
                       <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><ShoppingCart size={24}/></div>
                       <span className="text-[9px] font-black px-2 py-1 rounded-lg border uppercase bg-amber-50 text-amber-700 border-amber-200">
                         {cat?.name || 'Sem Categoria'}
                       </span>
                     </div>
                     <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-600 uppercase tracking-tighter transition-colors">{prod.name}</h3>
                     <p className="text-[9px] font-bold text-slate-300 uppercase mt-2 flex items-center gap-1"><Calendar size={10} /> Criado em: {new Date(prod.createdAt).toLocaleDateString()}</p>
                     
                     <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2">
                       <button onClick={(e) => { e.stopPropagation(); setItemToEdit(prod); setProdModalOpen(true); }} className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Edit3 size={16} /></button>
                       <button onClick={(e) => { e.stopPropagation(); setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover "${prod.name}" para a Lixeira?`, onConfirm: () => { moveToTrash('product', [prod.id]); setConfirmConfig(null); } }); }} className="p-2 bg-rose-500 text-white rounded-xl shadow-lg"><Trash2 size={16} /></button>
                     </div>
                   </div>
                 );
               })}
               {products.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nenhum produto cadastrado</p>
                  </div>
               )}
             </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                    <th className="px-4 py-5 w-12">
                      <button onClick={toggleSelectAllCats} className="p-1 rounded hover:bg-slate-200 transition-colors">
                        {selectedCatIds.size === productCategories.length && productCategories.length > 0 ? <CheckSquare size={16} className="text-rose-500"/> : <Square size={16}/>}
                      </button>
                    </th>
                    <th className="px-8 py-5">Nome da Categoria</th>
                    <th className="px-8 py-5">Itens Vinculados</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {productCategories.map(cat => {
                    const linkedCount = products.filter(p => p.categoryId === cat.id).length;
                    return (
                      <tr key={cat.id} className={`hover:bg-slate-50 group ${selectedCatIds.has(cat.id) ? 'bg-rose-50' : ''}`}>
                        <td className="px-4 py-5">
                          <button onClick={() => toggleSelectCat(cat.id)} className="p-1 rounded hover:bg-slate-200 transition-colors">
                            {selectedCatIds.has(cat.id) ? <CheckSquare size={16} className="text-rose-500"/> : <Square size={16} className="text-slate-300"/>}
                          </button>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><Layers size={16}/></div>
                             <span className="font-black text-slate-900 uppercase">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase">{linkedCount} Produtos</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setItemToEdit(cat); setCatModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 transition-all"><Edit3 size={18}/></button>
                              <button onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover a categoria "${cat.name}" para a Lixeira?`, onConfirm: () => { moveToTrash('productCategory', [cat.id]); setConfirmConfig(null); } })} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={18}/></button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                  {productCategories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-20 text-center text-slate-300 uppercase text-xs font-black tracking-widest">Nenhuma categoria personalizada</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedProdId && selectedProd && activeTab === 'products' && (
          <div className="w-[480px] flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 gap-3">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2 min-w-0 truncate">
                <Package size={20} className="text-amber-500 flex-shrink-0" /> Perfil do Produto
              </h2>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => { setItemToEdit(selectedProd); setProdModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Editar"><Edit3 size={18} /></button>
                <button onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover "${selectedProd.name}" para a Lixeira?`, onConfirm: () => { moveToTrash('product', [selectedProd.id]); setSelectedProdId(null); setConfirmConfig(null); } })} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Excluir"><Trash2 size={18} /></button>
                <button onClick={() => setSelectedProdId(null)} className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl transition-all"><X size={22} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-12 flex flex-col items-center text-center">
              <div className="w-32 h-32 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 border-4 border-white shadow-2xl">
                <Tag size={48} />
              </div>
              <div className="space-y-4 w-full">
                <h3 className="text-3xl font-black text-slate-900 leading-tight uppercase tracking-tighter">{selectedProd.name}</h3>
                <div className="flex justify-center mb-6">
                   <span className="text-xs font-black px-4 py-1.5 rounded-full border-2 uppercase tracking-widest bg-amber-50 text-amber-700 border-amber-300">
                      {productCategories.find(c => c.id === selectedProd.categoryId)?.name || 'Sem Categoria'}
                   </span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-4">Data de Cadastro: {new Date(selectedProd.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="w-full p-8 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  Este produto no catálogo base serve como modelo para vincular às turmas. O valor final deve ser configurado dentro de cada comissão de formatura específica.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {(selectedProdIds.size > 0 || selectedCatIds.size > 0) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom duration-200">
          {activeTab === 'products' && selectedProdIds.size > 0 && (
            <>
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">{selectedProdIds.size} produto{selectedProdIds.size > 1 ? 's' : ''}</span>
              <div className="w-px h-5 bg-slate-700" />
              <button onClick={handleBulkDeleteProds} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                <Trash2 size={14} /> Mover para Lixeira
              </button>
              <button onClick={() => setSelectedProdIds(new Set())} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"><X size={16} /></button>
            </>
          )}
          {activeTab === 'categories' && selectedCatIds.size > 0 && (
            <>
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">{selectedCatIds.size} categoria{selectedCatIds.size > 1 ? 's' : ''}</span>
              <div className="w-px h-5 bg-slate-700" />
              <button onClick={handleBulkDeleteCats} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                <Trash2 size={14} /> Mover para Lixeira
              </button>
              <button onClick={() => setSelectedCatIds(new Set())} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"><X size={16} /></button>
            </>
          )}
        </div>
      )}

      {prodModalOpen && <ProductModal product={itemToEdit} onClose={() => setProdModalOpen(false)} onSave={handleSaveProduct} />}
      {catModalOpen && <CategoryModal category={itemToEdit} onClose={() => setCatModalOpen(false)} onSave={handleSaveCategory} />}
      
      {isImportModalOpen && (
        <BulkImportModal 
          title="Produtos" 
          fields={[
            { key: 'name', label: 'Nome do Produto', required: true },
            { key: 'categoryId', label: 'ID da Categoria (opcional)' }
          ]} 
          onClose={() => setIsImportModalOpen(false)} 
          onImport={handleBulkImport} 
        />
      )}

      {confirmConfig && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel="Sim, Mover"
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
};

export default ProdutosAdmin;
