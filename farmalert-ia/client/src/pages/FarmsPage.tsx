import React, { useEffect, useMemo, useState } from 'react';
import { Plus, MapPin, Tractor, Pencil, Trash2, Save, X, Search, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { farmsService } from '../services/farmsService';
import type { Farm, CreateFarmInput, UpdateFarmInput } from '../types/farm';

const defaultFarm: CreateFarmInput = {
  name: '',
  type: 'cereales',
  sizeHectares: 0,
  latitude: 0,
  longitude: 0,
  address: '',
  region: 'Normandie',
};

const farmTypes = [
  { value: 'cereales', label: 'Céréales' },
  { value: 'laitier', label: 'Laitier' },
  { value: 'bio', label: 'Biologique' },
  { value: 'elevage', label: 'Élevage' },
  { value: 'legumes', label: 'Légumes' },
  { value: 'fruits', label: 'Fruits' },
] as const;

const FarmsPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Create/Edit state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateFarmInput>({ ...defaultFarm });

  const filteredFarms = useMemo(() => {
    return farms.filter(f => {
      const matchesQuery = `${f.name} ${f.address} ${f.region}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesType = !typeFilter || f.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [farms, query, typeFilter]);

  const loadFarms = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await farmsService.list(token!);
      setFarms(list);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors du chargement des fermes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadFarms();
  }, [token]);

  const resetForm = () => setForm({ ...defaultFarm });

  const handleCreate = async () => {
    try {
      setLoading(true);
      const created = await farmsService.create(token!, form);
      setFarms(prev => [created, ...prev]);
      setIsCreating(false);
      resetForm();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number, data: UpdateFarmInput) => {
    try {
      setLoading(true);
      const updated = await farmsService.update(token!, id, data);
      setFarms(prev => prev.map(f => (f.id === id ? updated : f)));
      setEditingId(null);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer définitivement cette ferme ?')) return;
    try {
      setLoading(true);
      await farmsService.remove(token!, id);
      setFarms(prev => prev.filter(f => f.id !== id));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes fermes</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" /> Nouvelle ferme
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-9 pr-3 py-2 border rounded-lg"
            placeholder="Rechercher une ferme..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            className="border rounded-lg py-2 px-3"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tous les types</option>
            {farmTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFarms.map((farm) => (
          <div key={farm.id} className="border rounded-xl p-4 bg-white shadow-sm">
            {editingId === farm.id ? (
              <EditFarmCard
                farm={farm}
                onCancel={() => setEditingId(null)}
                onSave={(data) => handleUpdate(farm.id, data)}
              />
            ) : (
              <ViewFarmCard
                farm={farm}
                onEdit={() => setEditingId(farm.id)}
                onDelete={() => handleDelete(farm.id)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!loading && farms.length === 0 && (
        <div className="text-center text-gray-600 py-12">Aucune ferme trouvée. Ajoutez votre première ferme.</div>
      )}

      {/* Create Drawer */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Ajouter une ferme</h2>
              <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <FarmForm
              value={form}
              onChange={setForm}
              onSubmit={handleCreate}
              submitting={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ViewFarmCard: React.FC<{
  farm: Farm;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ farm, onEdit, onDelete }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{farm.name}</h3>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-lg">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-2">
        <div className="flex items-center gap-2">
          <Tractor className="w-4 h-4" />
          <span>Type: <b className="capitalize">{farm.type}</b> • {farm.sizeHectares} ha</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{farm.address} — {farm.region}</span>
        </div>
        <div className="text-xs text-gray-500">GPS: {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}</div>
      </div>
      <div className="mt-4">
        <Link
          to={`/farms/${farm.id}`}
          className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800"
        >
          Voir la météo et les alertes →
        </Link>
      </div>
    </div>
  );
};

const EditFarmCard: React.FC<{
  farm: Farm;
  onCancel: () => void;
  onSave: (data: UpdateFarmInput) => void;
}> = ({ farm, onCancel, onSave }) => {
  const [local, setLocal] = useState<UpdateFarmInput>({
    name: farm.name,
    type: farm.type,
    sizeHectares: farm.sizeHectares,
    latitude: farm.latitude,
    longitude: farm.longitude,
    address: farm.address,
    region: farm.region,
  });

  return (
    <div>
      <div className="grid md:grid-cols-2 gap-3">
        <input
          className="border rounded-lg px-3 py-2"
          value={local.name}
          onChange={(e) => setLocal({ ...local, name: e.target.value })}
          placeholder="Nom de la ferme"
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={local.type}
          onChange={(e) => setLocal({ ...local, type: e.target.value as any })}
        >
          {farmTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="number"
          className="border rounded-lg px-3 py-2"
          value={local.sizeHectares}
          onChange={(e) => setLocal({ ...local, sizeHectares: Number(e.target.value) })}
          placeholder="Surface (ha)"
        />
        <input
          className="border rounded-lg px-3 py-2"
          value={local.address}
          onChange={(e) => setLocal({ ...local, address: e.target.value })}
          placeholder="Adresse"
        />
        <input
          className="border rounded-lg px-3 py-2"
          value={local.region}
          onChange={(e) => setLocal({ ...local, region: e.target.value })}
          placeholder="Région"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            value={local.latitude}
            onChange={(e) => setLocal({ ...local, latitude: Number(e.target.value) })}
            placeholder="Latitude"
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            value={local.longitude}
            onChange={(e) => setLocal({ ...local, longitude: Number(e.target.value) })}
            placeholder="Longitude"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 rounded-lg border">Annuler</button>
        <button
          onClick={() => onSave(local)}
          className="px-3 py-2 rounded-lg bg-green-600 text-white inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Enregistrer
        </button>
      </div>
    </div>
  );
};

const FarmForm: React.FC<{
  value: CreateFarmInput;
  onChange: (v: CreateFarmInput) => void;
  onSubmit: () => void;
  submitting?: boolean;
}> = ({ value, onChange, onSubmit, submitting }) => {
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <input
          className="border rounded-lg px-3 py-2"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Nom de la ferme"
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as any })}
        >
          {farmTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="number"
          className="border rounded-lg px-3 py-2"
          value={value.sizeHectares}
          onChange={(e) => onChange({ ...value, sizeHectares: Number(e.target.value) })}
          placeholder="Surface (ha)"
        />
        <input
          className="border rounded-lg px-3 py-2"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="Adresse"
        />
        <input
          className="border rounded-lg px-3 py-2"
          value={value.region}
          onChange={(e) => onChange({ ...value, region: e.target.value })}
          placeholder="Région"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: Number(e.target.value) })}
            placeholder="Latitude"
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: Number(e.target.value) })}
            placeholder="Longitude"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onSubmit} disabled={submitting} className="px-4 py-2 rounded-lg bg-green-600 text-white">
          Créer la ferme
        </button>
      </div>
    </div>
  );
};

export default FarmsPage;
