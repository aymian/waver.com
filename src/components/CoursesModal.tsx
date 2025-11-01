import { useState } from "react";
import { X, BookOpen, Clock, Users, Star, Play, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

// Define the course type
interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  rating: number;
  students: number;
  price: number;
  discountedPrice?: number;
  thumbnail: string;
  category: string;
  isEnrolled?: boolean;
  isLocked?: boolean;
}

// Sample courses data - you can modify this array as needed
const sampleCourses: Course[] = [
  {
    id: "1",
    title: "Advanced React Patterns",
    description: "Master advanced React patterns and techniques used by senior developers.",
    instructor: "Alex Johnson",
    duration: "8 hours",
    level: "Advanced",
    rating: 4.9,
    students: 12400,
    price: 89.99,
    discountedPrice: 49.99,
    thumbnail: "/placeholder.svg",
    category: "Frontend",
    isEnrolled: false,
  },
  {
    id: "2",
    title: "TypeScript Fundamentals",
    description: "Learn TypeScript from basics to advanced type systems and best practices.",
    instructor: "Sarah Miller",
    duration: "6 hours",
    level: "Beginner",
    rating: 4.8,
    students: 9800,
    price: 69.99,
    thumbnail: "/placeholder.svg",
    category: "Programming",
    isEnrolled: true,
  },
  {
    id: "3",
    title: "UI/UX Design Principles",
    description: "Create stunning user interfaces with modern design principles and tools.",
    instructor: "Michael Chen",
    duration: "10 hours",
    level: "Intermediate",
    rating: 4.7,
    students: 15600,
    price: 79.99,
    discountedPrice: 39.99,
    thumbnail: "/placeholder.svg",
    category: "Design",
    isEnrolled: false,
  },
  {
    id: "4",
    title: "Node.js Backend Development",
    description: "Build scalable backend services with Node.js, Express, and MongoDB.",
    instructor: "David Wilson",
    duration: "12 hours",
    level: "Intermediate",
    rating: 4.9,
    students: 11200,
    price: 99.99,
    thumbnail: "/placeholder.svg",
    category: "Backend",
    isEnrolled: false,
    isLocked: true,
  },
  {
    id: "5",
    title: "Cloud Deployment Mastery",
    description: "Deploy applications to AWS, Azure, and Google Cloud with confidence.",
    instructor: "Emma Thompson",
    duration: "9 hours",
    level: "Advanced",
    rating: 4.8,
    students: 8700,
    price: 109.99,
    discountedPrice: 59.99,
    thumbnail: "/placeholder.svg",
    category: "DevOps",
    isEnrolled: false,
  },
  {
    id: "6",
    title: "Mobile App Development",
    description: "Create cross-platform mobile apps with React Native and Expo.",
    instructor: "James Rodriguez",
    duration: "14 hours",
    level: "Intermediate",
    rating: 4.6,
    students: 9300,
    price: 89.99,
    thumbnail: "/placeholder.svg",
    category: "Mobile",
    isEnrolled: false,
  },
];

interface CoursesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CoursesModal = ({ open, onOpenChange }: CoursesModalProps) => {
  const [courses] = useState<Course[]>(sampleCourses);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // Get unique categories
  const categories = ["All", ...Array.from(new Set(courses.map(course => course.category)))];

  // Filter courses by category
  const filteredCourses = selectedCategory === "All" 
    ? courses 
    : courses.filter(course => course.category === selectedCategory);

  const handleCourseAction = (course: Course) => {
    if (course.isEnrolled) {
      // Navigate to course
      window.location.href = `/course/${course.id}`;
    } else if (course.isLocked) {
      // Show locked message or redirect to purchase
      alert(`This course is locked. Please upgrade your plan to access "${course.title}"`);
    } else {
      // Enroll in course
      alert(`Successfully enrolled in "${course.title}"!`);
      // In a real app, you would make an API call here
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl">Our Courses</DialogTitle>
              <DialogDescription>
                Browse our collection of expert-led courses
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative">
                <div className="bg-gray-200 border-2 border-dashed rounded-t-xl w-full h-40" />
                {course.isEnrolled && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Enrolled
                  </div>
                )}
                {course.isLocked && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-white" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  {course.level}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                  <div className="flex items-center bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{course.rating}</span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <span className="flex items-center mr-3">
                    <Users className="h-4 w-4 mr-1" />
                    {course.students.toLocaleString()}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {course.duration}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <div>
                    {course.discountedPrice ? (
                      <div className="flex items-center">
                        <span className="font-bold text-lg">${course.discountedPrice}</span>
                        <span className="ml-2 text-sm text-muted-foreground line-through">${course.price}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-lg">${course.price}</span>
                    )}
                  </div>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                    {course.category}
                  </span>
                </div>
                
                <Button 
                  className="w-full"
                  variant={course.isEnrolled ? "secondary" : "default"}
                  onClick={() => handleCourseAction(course)}
                  disabled={course.isLocked}
                >
                  {course.isEnrolled ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </>
                  ) : course.isLocked ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Locked Content
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Enroll Now
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredCourses.length === 0 && (
          <div className="text-center py-10">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses found</h3>
            <p className="text-muted-foreground">
              Try selecting a different category
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CoursesModal;