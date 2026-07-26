import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '../../compat/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { MapPin, Plus, Edit, Trash2, Building2, Search, ArrowLeft } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

interface Location {
  id: string;
  name: string;
  category: string;
}

const CATEGORIES = ['Room', 'Building', 'Department', 'Common Area', 'Other'] as const;

const LocationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const locationsQuery = query(collection(db, 'locations'), orderBy('name'));
    const unsubscribe = onSnapshot(
      locationsQuery,
      (snapshot) => {
        const locationsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name,
          category: docSnap.data().category,
        }));
        setLocations(locationsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching locations:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === 'All' || location.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [locations, searchTerm, categoryFilter]);

  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingLocation) {
        await updateDoc(doc(db, 'locations', editingLocation.id), {
          name: formData.name.trim(),
          category: formData.category,
          updatedAt: new Date(),
        });
        toast({
          title: 'Success',
          description: 'Location updated successfully',
        });
      } else {
        await addDoc(collection(db, 'locations'), {
          name: formData.name.trim(),
          category: formData.category,
          createdAt: new Date(),
        });
        toast({
          title: 'Success',
          description: 'Location added successfully',
        });
      }
      setDialogOpen(false);
      setFormData({ name: '', category: '' });
      setEditingLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Error',
        description: 'Failed to save location',
        variant: 'destructive',
      });
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setFormData({ name: location.name, category: location.category });
    setDialogOpen(true);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await deleteDoc(doc(db, 'locations', id));
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setFormData({ name: '', category: '' });
    setEditingLocation(null);
  };

  const filterTabs = ['All', ...CATEGORIES];

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 text-gray-500 hover:text-gray-900"
          onClick={() => navigate('/admin/settings')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Button>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Configuration</p>
        <h1 className="text-xl font-bold text-gray-900">Location Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage rooms, buildings, and departments for complaint filing
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations
              </CardTitle>
              <CardDescription>
                {loading
                  ? 'Loading locations…'
                  : `${locations.length} location${locations.length === 1 ? '' : 's'} · ${filteredLocations.length} shown`}
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingLocation(null)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
                  <DialogDescription>
                    {editingLocation
                      ? 'Update the location details below'
                      : 'Add a new location to the system'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitLocation}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">Location Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Room 101, Main Building, Library"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingLocation ? 'Update' : 'Add'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search locations by name…"
              className="pl-9"
            />
          </div>

          <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {filterTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading locations...</div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              {locations.length === 0 ? (
                <>
                  <p>No locations added yet</p>
                  <p className="text-sm mt-1">Click &quot;Add Location&quot; to get started</p>
                </>
              ) : (
                <>
                  <p>No locations match your search</p>
                  <p className="text-sm mt-1">Try a different name or category filter</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{location.name}</p>
                      <p className="text-sm text-gray-500">{location.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditLocation(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationsPage;
