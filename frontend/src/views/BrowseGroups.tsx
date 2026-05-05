/**
 * BrowseGroups – discover and join existing group chats
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GroupChatService } from '../services/groupChatService';
import type { GroupChat, GroupCategory } from '../types/groupChat';
import { GROUP_CATEGORY_LABELS, GROUP_CATEGORY_COLORS } from '../types/groupChat';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Search, Users, Hash, UserPlus, Check } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from '../compat/router';

const BrowseGroups: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [allGroups, setAllGroups] = useState<GroupChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const userId = currentUser?.uid || '';
  const displayName = currentUser?.displayName || currentUser?.email || 'User';

  useEffect(() => {
    const load = async () => {
      try {
        const groups = await GroupChatService.getAllGroups();
        setAllGroups(groups);
      } catch (err) {
        console.error('Failed to load groups:', err);
      }
    };
    load();
  }, []);

  const filteredGroups = allGroups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleJoin = async (group: GroupChat) => {
    setJoiningId(group.id);
    try {
      await GroupChatService.joinGroup(group.id, userId, displayName);
      toast({ title: 'Joined!', description: `You joined "${group.name}"` });
      // Refresh list
      setAllGroups((prev) =>
        prev.map((g) =>
          g.id === group.id
            ? { ...g, memberIds: [...g.memberIds, userId], memberCount: (g.memberCount || g.memberIds.length) + 1 }
            : g
        )
      );
    } catch (err) {
      toast({ title: 'Error', description: 'Could not join group.', variant: 'destructive' });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Browse Group Chats</h1>
        <p className="text-muted-foreground">
          Discover communities, join conversations, and speak up together.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or description…"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(Object.keys(GROUP_CATEGORY_LABELS) as GroupCategory[]).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {GROUP_CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Groups grid */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Hash className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No groups found</p>
          <p className="text-sm mt-1">Try a different search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const isMember = group.memberIds.includes(userId);
            return (
              <Card
                key={group.id}
                className="hover:shadow-lg transition-shadow border-border/60"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      <Hash className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{group.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5 line-clamp-2">
                        {group.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        GROUP_CATEGORY_COLORS[group.category] || GROUP_CATEGORY_COLORS.general
                      }`}
                    >
                      {GROUP_CATEGORY_LABELS[group.category]}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.memberCount || group.memberIds.length}
                    </span>
                  </div>

                  {isMember ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/group-chats')}
                    >
                      <Check className="h-4 w-4 mr-1" /> Joined — Open Chat
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleJoin(group)}
                      disabled={joiningId === group.id}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {joiningId === group.id ? 'Joining…' : 'Join Group'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrowseGroups;
