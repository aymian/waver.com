import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  Lock, 
  Globe, 
  Users, 
  Settings,
  Edit3,
  Check,
  X,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// Define types
interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  country_name: string;
  website: string;
  twitter: string;
  linkedin: string;
  github: string;
  is_private: boolean;
  created_at: string;
}

interface FollowerProfile {
  full_name: string;
  display_name: string;
  avatar_url: string;
}

interface FollowerData {
  id: string;
  follower_id: string;
  following_id: string;
  status: string;
  created_at: string;
  follower_profile?: FollowerProfile | FollowerProfile[];
}

interface FollowingProfile {
  full_name: string;
  display_name: string;
  avatar_url: string;
}

interface FollowingData {
  id: string;
  follower_id: string;
  following_id: string;
  status: string;
  created_at: string;
  following_profile?: FollowingProfile | FollowingProfile[];
}

const Profile = () => {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followers, setFollowers] = useState<FollowerData[]>([]);
  const [following, setFollowing] = useState<FollowingData[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("followers");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileData>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Check if viewing own profile
  useEffect(() => {
    if (currentUser && userId) {
      setIsOwnProfile(currentUser.id === userId);
    } else if (currentUser && !userId) {
      setIsOwnProfile(true);
    }
  }, [currentUser, userId]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId && !currentUser) return;
      
      const targetUserId = userId || currentUser?.id;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .single();
        
        if (error) throw error;
        
        setProfile(data);
        setEditedProfile(data);
        
        // Check follow status if not own profile
        if (currentUser && currentUser.id !== targetUserId) {
          const { data: followData, error: followError } = await supabase
            .from("followers")
            .select("status")
            .eq("follower_id", currentUser.id)
            .eq("following_id", targetUserId)
            .maybeSingle();
          
          if (!followError && followData) {
            setIsFollowing(followData.status === "accepted");
            setFollowStatus(followData.status);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [userId, currentUser]);

  // Fetch followers and following counts
  useEffect(() => {
    const fetchCounts = async () => {
      if (!profile) return;
      
      try {
        // Fetch followers count
        const { count: followersCount, error: followersError } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id)
          .eq("status", "accepted");
        
        if (!followersError) {
          setFollowerCount(followersCount || 0);
        }
        
        // Fetch following count
        const { count: followingCount, error: followingError } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profile.id)
          .eq("status", "accepted");
        
        if (!followingError) {
          setFollowingCount(followingCount || 0);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };
    
    if (profile) {
      fetchCounts();
    }
  }, [profile]);

  // Fetch followers/following data when tab changes
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      try {
        if (activeTab === "followers") {
          const { data, error } = await supabase
            .from("followers")
            .select(`
              id,
              follower_id,
              following_id,
              status,
              created_at,
              follower_profile:profiles!follower_id (
                full_name,
                display_name,
                avatar_url
              )
            `)
            .eq("following_id", profile.id)
            .eq("status", "accepted")
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
          
          if (!error) {
            // Fix the type issue by ensuring follower_profile is properly structured
            const followersData: FollowerData[] = (data || []).map((follower: any) => ({
              ...follower,
              follower_profile: follower.follower_profile && Array.isArray(follower.follower_profile) 
                ? follower.follower_profile[0] 
                : follower.follower_profile
            }));
            setFollowers(followersData);
          }
        } else {
          const { data, error } = await supabase
            .from("followers")
            .select(`
              id,
              follower_id,
              following_id,
              status,
              created_at,
              following_profile:profiles!following_id (
                full_name,
                display_name,
                avatar_url
              )
            `)
            .eq("follower_id", profile.id)
            .eq("status", "accepted")
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
          
          if (!error) {
            // Fix the type issue by ensuring following_profile is properly structured
            const followingData: FollowingData[] = (data || []).map((following: any) => ({
              ...following,
              following_profile: following.following_profile && Array.isArray(following.following_profile) 
                ? following.following_profile[0] 
                : following.following_profile
            }));
            setFollowing(followingData);
          }
        }
      } catch (error) {
        console.error("Error fetching followers/following:", error);
      }
    };
    
    if (profile) {
      fetchData();
    }
  }, [profile, activeTab, currentPage]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    
    try {
      const { data, error } = await supabase
        .from("followers")
        .insert([
          {
            follower_id: currentUser.id,
            following_id: profile.id,
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update UI based on follow status
      if (data.status === "accepted") {
        setIsFollowing(true);
        setFollowStatus("accepted");
        setFollowerCount(prev => prev + 1);
        toast.success("You are now following this user");
      } else {
        setFollowStatus("pending");
        toast.success("Follow request sent");
      }
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || !profile) return;
    
    try {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id);
      
      if (error) throw error;
      
      setIsFollowing(false);
      setFollowStatus(null);
      setFollowerCount(prev => prev - 1);
      toast.success("Unfollowed user");
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    }
  };

  const handleCancelRequest = async () => {
    if (!currentUser || !profile) return;
    
    try {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id)
        .eq("status", "pending");
      
      if (error) throw error;
      
      setFollowStatus(null);
      toast.success("Follow request cancelled");
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request");
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !profile) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update(editedProfile)
        .eq("id", currentUser.id);
      
      if (error) throw error;
      
      setProfile(prev => ({ ...prev, ...editedProfile } as ProfileData));
      setEditMode(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const filteredFollowers = followers.filter(follower => {
    const profile = Array.isArray(follower.follower_profile) 
      ? follower.follower_profile[0] 
      : follower.follower_profile;
    return profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredFollowing = following.filter(following => {
    const profile = Array.isArray(following.following_profile) 
      ? following.following_profile[0] 
      : following.following_profile;
    return profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested profile could not be found.</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.full_name || "User";
  const totalPages = Math.ceil(
    (activeTab === "followers" ? followerCount : followingCount) / itemsPerPage
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-6 mb-6 border shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{displayName}</h1>
                  {profile.full_name && profile.full_name !== displayName && (
                    <p className="text-muted-foreground">@{profile.full_name.toLowerCase().replace(/\s+/g, '')}</p>
                  )}
                  <p className="text-muted-foreground">{profile.email}</p>
                </div>
                
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    editMode ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditMode(false)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSaveProfile}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditMode(true)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    )
                  ) : followStatus === "pending" ? (
                    <Button 
                      variant="outline" 
                      onClick={handleCancelRequest}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Cancel Request
                    </Button>
                  ) : isFollowing ? (
                    <Button 
                      variant="outline" 
                      onClick={handleUnfollow}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Unfollow
                    </Button>
                  ) : (
                    <Button onClick={handleFollow}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Follow
                    </Button>
                  )}
                </div>
              </div>
              
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Display Name</label>
                    <input
                      type="text"
                      value={editedProfile.display_name || ""}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, display_name: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bio</label>
                    <textarea
                      value={editedProfile.bio || ""}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Private Profile</label>
                    <input
                      type="checkbox"
                      checked={editedProfile.is_private || false}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, is_private: e.target.checked }))}
                      className="rounded"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {profile.bio && (
                    <p className="text-muted-foreground mb-4">{profile.bio}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-semibold">{followerCount}</span> followers
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-semibold">{followingCount}</span> following
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.is_private ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        {profile.is_private ? "Private" : "Public"} Profile
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                    {profile.country_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profile.country_name}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={profile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Website
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Followers/Following Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-6 border shadow-sm"
        >
          <div className="flex border-b mb-6">
            <button
              className={`pb-3 px-4 font-medium ${activeTab === "followers" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => {
                setActiveTab("followers");
                setCurrentPage(1);
              }}
            >
              Followers ({followerCount})
            </button>
            <button
              className={`pb-3 px-4 font-medium ${activeTab === "following" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => {
                setActiveTab("following");
                setCurrentPage(1);
              }}
            >
              Following ({followingCount})
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
            />
          </div>
          
          {/* List */}
          <div className="space-y-4">
            {(activeTab === "followers" ? filteredFollowers : filteredFollowing).map((item) => {
              const user = activeTab === "followers" 
                ? (Array.isArray(item.follower_profile) ? item.follower_profile[0] : item.follower_profile)
                : (Array.isArray(item.following_profile) ? item.following_profile[0] : item.following_profile);
              
              return (
                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {user?.display_name?.charAt(0) || user?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {user?.display_name || user?.full_name || "User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{user?.full_name?.toLowerCase().replace(/\s+/g, '') || "user"}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/profile/${activeTab === "followers" ? item.follower_id : item.following_id}`)}
                  >
                    View Profile
                  </Button>
                </div>
              );
            })}
            
            {filteredFollowers.length === 0 && activeTab === "followers" && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No followers yet</h3>
                <p className="text-muted-foreground">
                  When people follow this user, they'll appear here
                </p>
              </div>
            )}
            
            {filteredFollowing.length === 0 && activeTab === "following" && (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Not following anyone</h3>
                <p className="text-muted-foreground">
                  This user isn't following anyone yet
                </p>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;