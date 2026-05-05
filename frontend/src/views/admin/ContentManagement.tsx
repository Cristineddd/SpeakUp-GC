import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Video, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useToast } from '../../hooks/use-toast';

interface VideoContent {
  id: string;
  title: string;
  host: string;
  description: string;
  duration: string;
  tags: string[]; // Changed from single category to multiple tags
  videoId: string; // YouTube video ID
  createdAt: Date;
  updatedAt: Date;
}

const ContentManagement = () => {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoContent | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoContent | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    host: '',
    description: '',
    duration: '',
    tags: [] as string[], // Changed to array for multiple tags
    videoId: '',
  });

  const [fetchingVideoInfo, setFetchingVideoInfo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const categories = [
    'Mental Wellness',
    'Anxiety Management',
    'Depression Support',
    'Stress Relief',
    'Mindfulness',
    'Self-Care',
    'Relationships',
    'Sleep Health',
    'Other'
  ];

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const videosRef = collection(db, 'mentalHealthVideos');
      const q = query(videosRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const videosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as VideoContent[];
      
      setVideos(videosData);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load videos. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (video?: VideoContent) => {
    if (video) {
      setEditingVideo(video);
      setFormData({
        title: video.title,
        host: video.host,
        description: video.description,
        duration: video.duration,
        tags: video.tags || [],
        videoId: video.videoId,
      });
      setVideoUrl(`https://www.youtube.com/watch?v=${video.videoId}`);
    } else {
      setEditingVideo(null);
      setFormData({
        title: '',
        host: '',
        description: '',
        duration: '',
        tags: [],
        videoId: '',
      });
      setVideoUrl('');
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingVideo(null);
    setFormData({
      title: '',
      host: '',
      description: '',
      duration: '',
      tags: [],
      videoId: '',
    });
    setVideoUrl('');
    setFetchingVideoInfo(false);
  };

  const fetchVideoInfo = async (videoId: string) => {
    setFetchingVideoInfo(true);
    try {
      // Using noembed.com as a simple way to get YouTube metadata without API key
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await response.json();
      
      if (data.title) {
        // Extract duration from video using a different approach
        // Since noembed doesn't provide duration, we'll use YouTube's oEmbed
        const ytResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        const ytData = await ytResponse.json();
        
        setFormData(prev => ({
          ...prev,
          title: data.title || ytData.title || '',
          host: data.author_name || ytData.author_name || '',
          description: data.description || `Video by ${data.author_name || ytData.author_name}`,
          videoId: videoId,
        }));

        toast({
          title: 'Success',
          description: 'Video information fetched successfully!',
        });
      } else {
        throw new Error('Could not fetch video information');
      }
    } catch (error) {
      console.error('Error fetching video info:', error);
      toast({
        title: 'Information',
        description: 'Could not auto-fetch video details. Please enter them manually.',
        variant: 'default',
      });
      // Still set the videoId so user can proceed manually
      setFormData(prev => ({
        ...prev,
        videoId: videoId,
      }));
    } finally {
      setFetchingVideoInfo(false);
    }
  };

  const handleVideoUrlChange = async (url: string) => {
    setVideoUrl(url);
    const videoId = extractVideoId(url);
    
    if (videoId && videoId.length === 11) {
      // Valid YouTube video ID length
      await fetchVideoInfo(videoId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - only videoId is required now, other fields can be auto-filled
    if (!formData.videoId) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid YouTube URL.',
        variant: 'destructive',
      });
      return;
    }

    // Check if title is still empty (auto-fetch failed and user didn't fill)
    if (!formData.title) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a video title.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingVideo) {
        // Update existing video
        const videoRef = doc(db, 'mentalHealthVideos', editingVideo.id);
        await updateDoc(videoRef, {
          ...formData,
          updatedAt: new Date(),
        });
        
        toast({
          title: 'Success',
          description: 'Video updated successfully.',
        });
      } else {
        // Add new video
        await addDoc(collection(db, 'mentalHealthVideos'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        toast({
          title: 'Success',
          description: 'Video added successfully.',
        });
      }

      handleCloseDialog();
      fetchVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: 'Error',
        description: 'Failed to save video. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (video: VideoContent) => {
    setVideoToDelete(video);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return;

    try {
      await deleteDoc(doc(db, 'mentalHealthVideos', videoToDelete.id));
      
      toast({
        title: 'Success',
        description: 'Video deleted successfully.',
      });
      
      setShowDeleteDialog(false);
      setVideoToDelete(null);
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const extractVideoId = (url: string): string => {
    // Extract YouTube video ID from various URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Content Library Management</h1>
          <p className="text-gray-600 mt-1">
            Manage mental health videos and podcasts displayed in the Learning Hub
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Video
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                <p className="text-gray-600 mb-4">
                  Start building your mental health content library by adding videos
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <Card key={video.id} className="flex flex-col">
                  <CardHeader>
                    <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden mb-4">
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                        }}
                      />
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                    <p className="text-sm text-gray-600">By {video.host}</p>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{video.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {video.tags && video.tags.length > 0 ? (
                        video.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No labels</span>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">{video.duration}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenDialog(video)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDeleteClick(video)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVideo ? 'Edit Video' : 'Add New Video'}
            </DialogTitle>
            <DialogDescription>
              {editingVideo 
                ? 'Update the video information below.' 
                : 'Paste a YouTube URL and we\'ll automatically fetch the video details for you.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">YouTube Video URL *</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                disabled={fetchingVideoInfo}
              />
              <p className="text-xs text-gray-500">
                Paste the full YouTube URL and we'll automatically get the video details
              </p>
              {fetchingVideoInfo && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Fetching video information...</span>
                </div>
              )}
            </div>

            {formData.videoId && (
              <>
                <div className="p-2 bg-gray-50 rounded border">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <img
                    src={`https://img.youtube.com/vi/${formData.videoId}/hqdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full rounded"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter video title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="host">Host/Creator *</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="Enter host or creator name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter video description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 15 mins"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Labels/Tags *</Label>
                    <div className="border rounded-lg p-3 bg-white space-y-2 max-h-40 overflow-y-auto">
                      {categories.map((tag) => (
                        <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={formData.tags.includes(tag)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, tags: [...formData.tags, tag] });
                              } else {
                                setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{tag}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Selected: {formData.tags.length} {formData.tags.length === 1 ? 'label' : 'labels'}
                    </p>
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={fetchingVideoInfo || !formData.videoId}>
                <Save className="h-4 w-4 mr-2" />
                {editingVideo ? 'Update Video' : 'Add Video'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{videoToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVideoToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContentManagement;
