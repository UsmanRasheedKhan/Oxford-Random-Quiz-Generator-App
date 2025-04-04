import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, TextField, Button, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress,
  Divider, IconButton, Grid, Chip, Checkbox, ListItemText, ListSubheader,
  Card, CardContent, List, ListItem, ListItemIcon, ListItemText as MuiListItemText,
  FormHelperText
} from '@mui/material';
import {
  School as DepartmentIcon, MenuBook as GradeIcon, AutoStories as SubjectIcon,
  Person as UserIcon, Email as EmailIcon, Badge as RoleIcon, ArrowBack as BackIcon
} from '@mui/icons-material';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const EditUser = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = location.state?.user;
  
  // Original user data for display purposes
  const [originalUserData, setOriginalUserData] = useState({
    name: '',
    email: '',
    role: '',
    departments: [],
    grades: [],
    subjects: []
  });
  
  // Form data for editing (starts with blank selections for dropdowns)
  const [formData, setFormData] = useState({
    name: '',
    departments: [],
    grades: [],
    subjects: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data for dropdowns
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // Loading states for dropdowns
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  
  // To keep track of the original data mappings
  const [departmentNameMap, setDepartmentNameMap] = useState({});
  const [gradeNameMap, setGradeNameMap] = useState({});
  const [subjectNameMap, setSubjectNameMap] = useState({});
  
  // Utility function to normalize IDs for consistent comparison
  const normalizeId = (id) => id ? String(id).trim() : '';

  // Add a new state for raw user data directly from database
  const [rawUserData, setRawUserData] = useState({
    name: '',
    email: '',
    role: '',
    department: [],  // Note: using 'department' singular as per your database
    grades: [],
    subjects: []
  });

  // At the beginning of your component, add this logging function
  useEffect(() => {
    // Debug logging
    if (rawUserData) {
      console.log("Raw user data loaded:", {
        name: rawUserData.name,
        email: rawUserData.email,
        role: rawUserData.role,
        department: rawUserData.department,
        grades: rawUserData.grades,
        subjects: rawUserData.subjects
      });
    }
  }, [rawUserData]);

  // First, let's add a useEffect to manually capture and log the problem
  useEffect(() => {
    console.log("DIRECT DEBUG - User details for display:");
    console.log("Raw department data:", rawUserData.department);
    console.log("Raw grades data:", rawUserData.grades);
    console.log("Raw subjects data:", rawUserData.subjects);
  }, [rawUserData.department, rawUserData.grades, rawUserData.subjects]);

  // Add this utility function at the component level to help with display
  const tryFormatValue = (value) => {
    if (!value) return '';
    
    // If it's an array, handle each item
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(', ');
    }
    
    // If it's a string, return as is
    if (typeof value === 'string') return value;
    
    // Otherwise, stringify it for display
    return JSON.stringify(value);
  };

  // Fetch user data to display in the details card
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userData?.email || !userData?.role) {
        setError('Missing user information. Please go back and try again.');
        return;
      }
      
      setLoading(true);
      
      try {
        // Initialize form with just the name
        const initialForm = {
          name: userData.name || '',
          departments: [],
          grades: [],
          subjects: []
        };
        
        // For teachers, fetch additional data
        if (userData.role === 'teacher') {
          const teachersRef = collection(db, 'users', 'usersData', 'teachers');
          const teacherQuery = query(teachersRef, where('email', '==', userData.email));
          const teacherSnapshot = await getDocs(teacherQuery);
          
          if (!teacherSnapshot.empty) {
            const teacherDoc = teacherSnapshot.docs[0];
            const teacherData = teacherDoc.data();
            console.log("Raw teacher document data:", JSON.stringify(teacherData, null, 2));
            
            // Store raw data directly from database
            setRawUserData({
              name: teacherData.name || '',
              email: teacherData.email || '',
              role: teacherData.role || 'teacher',
              department: teacherData.department || [],
              grades: teacherData.grades || [],
              subjects: teacherData.subjects || [],
              documentId: teacherDoc.id // Store the document ID for later use
            });
            
            // For compatibility with the rest of the code
            const userDetails = {
              name: teacherData.name || '',
              email: teacherData.email || '',
              role: teacherData.role || 'teacher',
              departments: [], // Will be processed below
              grades: [],
              subjects: []
            };
            
            // Process departments for compatibility
            if (teacherData.department !== undefined && teacherData.department !== null) {
              if (Array.isArray(teacherData.department)) {
                userDetails.departments = teacherData.department
                  .filter(dept => dept !== null && dept !== undefined)
                  .map(String);
              } else {
                userDetails.departments = [String(teacherData.department)];
              }
            }
            
            // Process grades
            if (teacherData.grades !== undefined && teacherData.grades !== null) {
              if (Array.isArray(teacherData.grades)) {
                userDetails.grades = teacherData.grades
                  .filter(grade => grade !== null && grade !== undefined)
                  .map(String);
              } else {
                userDetails.grades = [String(teacherData.grades)];
              }
            }
            
            // Process subjects
            if (teacherData.subjects !== undefined && teacherData.subjects !== null) {
              if (Array.isArray(teacherData.subjects)) {
                userDetails.subjects = teacherData.subjects
                  .filter(subject => subject !== null && subject !== undefined)
                  .map(String);
              } else {
                userDetails.subjects = [String(teacherData.subjects)];
              }
            }
            
            // Set originalUserData for compatibility
            setOriginalUserData(userDetails);
            
            // Set the name in the form
            initialForm.name = teacherData.name || '';
          }
        } else if (userData.role === 'admin') {
          // Similar handling for admin
          const adminsRef = collection(db, 'users', 'usersData', 'admins');
          const adminQuery = query(adminsRef, where('email', '==', userData.email));
          const adminSnapshot = await getDocs(adminQuery);
          
          if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0];
            const adminData = adminDoc.data();
            
            setRawUserData({
              name: adminData.name || '',
              email: adminData.email || '',
              role: 'admin',
              documentId: adminDoc.id
            });
            
            setOriginalUserData({
              name: adminData.name || '',
              email: adminData.email || '',
              role: 'admin',
              departments: [],
              grades: [],
              subjects: []
            });
            
            initialForm.name = adminData.name || '';
          }
        }
        
        setFormData(initialForm);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError('Failed to load user data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userData]);

  // Fix the departments filtering code to correctly show departments
  useEffect(() => {
    const loadDepartments = async () => {
      if (userData?.role !== 'teacher') return;
      
      setDepartmentsLoading(true);
      
      try {
        const categoriesRef = collection(db, 'categories');
        const categoriesSnapshot = await getDocs(categoriesRef);
        
        const departmentsList = categoriesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            name: doc.data().name || ''
          }))
          .filter(dept => {
            // Only include departments with proper names (not just IDs or empty strings)
            // This regex was incorrectly filtering out normal words like "Arts"
            return dept.name && dept.name.trim() !== '';
            
            // Optionally, to filter out things that look like GUIDs:
            // && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dept.name);
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log("Filtered departments:", departmentsList);
        setDepartments(departmentsList);
        
        // Create a mapping of department IDs/names for display in the details card
        const deptMap = {};
        departmentsList.forEach(dept => {
          deptMap[dept.id] = dept.name;
          deptMap[dept.name] = dept.name;
        });
        setDepartmentNameMap(deptMap);
        
      } catch (err) {
        console.error("Error loading departments:", err);
      } finally {
        setDepartmentsLoading(false);
      }
    };
    
    loadDepartments();
  }, [userData?.role]);

  // Improved grades loading with better debugging
  useEffect(() => {
    const loadGrades = async () => {
      if (userData?.role !== 'teacher' || !formData.departments.length) {
        setGrades([]);
        return;
      }
      
      setGradesLoading(true);
      console.log("Loading grades for departments:", formData.departments);
      
      try {
        // Load grades for all selected departments
        // Try both the department ID and the department NAME
        const gradesPromises = formData.departments.map(async (deptId) => {
          const deptObj = departments.find(d => d.id === deptId);
          const deptName = deptObj?.name || deptId;
          
          console.log(`Fetching grades for department: ${deptName} (ID: ${deptId})`);
          
          // First try querying by ID
          const gradesRef = collection(db, 'grades');
          const gradesQueryById = query(gradesRef, where('department', '==', deptId));
          const gradesSnapshotById = await getDocs(gradesQueryById);
          
          console.log(`Found ${gradesSnapshotById.size} grades with department ID match`);
          
          // If no results, try querying by name
          let gradesSnapshot = gradesSnapshotById;
          if (gradesSnapshotById.empty && deptName !== deptId) {
            console.log(`Trying to match by department name: ${deptName}`);
            const gradesQueryByName = query(gradesRef, where('department', '==', deptName));
            const gradesSnapshotByName = await getDocs(gradesQueryByName);
            console.log(`Found ${gradesSnapshotByName.size} grades with department NAME match`);
            
            if (gradesSnapshotByName.size > 0) {
              gradesSnapshot = gradesSnapshotByName;
            }
          }
          
          // If still no results, try with a case-insensitive approach
          if (gradesSnapshot.empty) {
            console.log("No exact matches, checking for grades with department field containing this value...");
            // We'll fetch all grades and filter client-side
            const allGradesQuery = query(gradesRef);
            const allGradesSnapshot = await getDocs(allGradesQuery);
            
            // Manual filtering with logging
            const matchedDocs = allGradesSnapshot.docs.filter(doc => {
              const deptValue = doc.data().department;
              if (!deptValue) return false;
              
              const isMatch = 
                String(deptValue).toLowerCase().includes(String(deptId).toLowerCase()) ||
                String(deptValue).toLowerCase().includes(String(deptName).toLowerCase());
                
              if (isMatch) {
                console.log(`Found potential match: Grade ${doc.data().name} with department ${deptValue}`);
              }
              
              return isMatch;
            });
            
            console.log(`Found ${matchedDocs.length} grades with fuzzy matching`);
            
            // Create a new snapshot-like object with the matched docs
            gradesSnapshot = {
              docs: matchedDocs,
              empty: matchedDocs.length === 0,
              size: matchedDocs.length
            };
          }
          
          return gradesSnapshot.docs.map(doc => {
            console.log(`Processing grade: ${doc.id} - ${doc.data().name || doc.id}`);
            return {
              id: doc.id,
              name: doc.data().name || doc.id,
              department: deptId,
              departmentName: deptName
            };
          });
        });
        
        const allGradesArrays = await Promise.all(gradesPromises);
        const allGrades = allGradesArrays.flat().sort((a, b) => {
          // Sort by department name first, then by grade name
          const deptCompare = a.departmentName.localeCompare(b.departmentName);
          return deptCompare !== 0 ? deptCompare : a.name.localeCompare(b.name);
        });
        
        console.log("Grades loaded and sorted by department:", allGrades);
        setGrades(allGrades);
        
        // Update grade name mapping
        const gradeMap = {};
        allGrades.forEach(grade => {
          gradeMap[grade.id] = `${grade.departmentName}: ${grade.name}`;
        });
        setGradeNameMap(gradeMap);
        
      } catch (err) {
        console.error("Error loading grades:", err);
      } finally {
        setGradesLoading(false);
      }
    };
    
    loadGrades();
  }, [formData.departments, departments, userData?.role]);

  // Enhanced subject loading with better debugging
  useEffect(() => {
    const loadSubjects = async () => {
      if (userData?.role !== 'teacher' || !formData.departments.length || !formData.grades.length) {
        setSubjects([]);
        return;
      }
      
      setSubjectsLoading(true);
      console.log("Loading subjects for selected grades:", formData.grades);
      
      try {
        // Create department-grade pairs for querying
        const deptGradePairs = [];
        
        formData.grades.forEach(gradeId => {
          const gradeObj = grades.find(g => normalizeId(g.id) === normalizeId(gradeId));
          
          if (gradeObj && gradeObj.department) {
            deptGradePairs.push({
              department: gradeObj.department,
              grade: gradeId,
              departmentName: gradeObj.departmentName,
              gradeName: gradeObj.name
            });
            console.log(`Created pair: department=${gradeObj.department}, grade=${gradeId}`);
          } else {
            console.log(`Could not find grade object for ID: ${gradeId}`);
          }
        });
        
        console.log("Department-Grade pairs for subject queries:", deptGradePairs);
        
        if (deptGradePairs.length === 0) {
          console.log("No valid department-grade pairs found, trying alternative approach");
          
          // Fallback: try to use just the grade IDs directly
          const simplePairs = formData.grades.map(gradeId => {
            // Extract department from grade format if it's like "Arts|Class 1"
            const parts = gradeId.split('|');
            let department = null;
            let gradeName = gradeId;
            
            if (parts.length > 1) {
              department = parts[0];
              gradeName = parts[1];
              console.log(`Split grade ID ${gradeId} into department=${department}, grade=${gradeName}`);
              
              return {
                department: department,
                grade: gradeId,
                departmentName: department,
                gradeName: gradeName
              };
            }
            
            // Try to find a matching department from selected departments
            for (const deptId of formData.departments) {
              const dept = departments.find(d => d.id === deptId);
              if (dept) {
                console.log(`Using department ${dept.name} for grade ${gradeId}`);
                return {
                  department: deptId,
                  grade: gradeId,
                  departmentName: dept.name,
                  gradeName: gradeId
                };
              }
            }
            
            return null;
          }).filter(Boolean);
          
          if (simplePairs.length > 0) {
            console.log("Created fallback department-grade pairs:", simplePairs);
            deptGradePairs.push(...simplePairs);
          }
        }
        
        if (deptGradePairs.length === 0) {
          console.log("Still no valid pairs, cannot fetch subjects");
          setSubjects([]);
          setSubjectsLoading(false);
          return;
        }
        
        // Load subjects for each department-grade pair with multiple matching strategies
        const subjectsPromises = deptGradePairs.map(async ({ department, grade, departmentName, gradeName }) => {
          console.log(`Fetching subjects for department=${department} (${departmentName}), grade=${grade} (${gradeName})`);
          
          // Try exact query first
          const subjectsRef = collection(db, 'subjects');
          const subjectsQuery = query(
            subjectsRef, 
            where('department', '==', department),
            where('grade', '==', grade)
          );
          let subjectsSnapshot = await getDocs(subjectsQuery);
          
          console.log(`Found ${subjectsSnapshot.size} subjects with exact match`);
          
          // If no results, try with department name instead of ID
          if (subjectsSnapshot.empty && departmentName) {
            console.log(`Trying with department name: ${departmentName} instead of ID`);
            const nameQuery = query(
              subjectsRef, 
              where('department', '==', departmentName),
              where('grade', '==', grade)
            );
            const nameSnapshot = await getDocs(nameQuery);
            
            if (nameSnapshot.size > 0) {
              console.log(`Found ${nameSnapshot.size} subjects with department name match`);
              subjectsSnapshot = nameSnapshot;
            }
          }
          
          // If still no results, try with just department (no grade filter)
          if (subjectsSnapshot.empty) {
            console.log("Trying with just department filter (no grade filter)");
            const deptOnlyQuery = query(subjectsRef, where('department', '==', department));
            const deptOnlySnapshot = await getDocs(deptOnlyQuery);
            
            if (deptOnlySnapshot.size > 0) {
              console.log(`Found ${deptOnlySnapshot.size} subjects with department-only match`);
              
              // Filter client-side for grades that might match
              const filteredDocs = deptOnlySnapshot.docs.filter(doc => {
                const subjectGrade = doc.data().grade;
                if (!subjectGrade) return false;
                
                const isMatch = 
                  normalizeId(subjectGrade) === normalizeId(grade) ||
                  String(subjectGrade).includes(String(gradeName));
                  
                if (isMatch) {
                  console.log(`Found matching subject: ${doc.data().name} with grade ${subjectGrade}`);
                }
                
                return isMatch;
              });
              
              if (filteredDocs.length > 0) {
                console.log(`Found ${filteredDocs.length} subjects after client-side filtering`);
                subjectsSnapshot = { docs: filteredDocs, empty: false, size: filteredDocs.length };
              }
            }
          }
          
          // If STILL no results, try fetching all subjects and filter client-side
          if (subjectsSnapshot.empty) {
            console.log("No match found with server queries, fetching all subjects for client-side filtering");
            const allSubjectsSnapshot = await getDocs(subjectsRef);
            
            // Try to match subjects by checking if their fields contain our department/grade values
            const matchedDocs = allSubjectsSnapshot.docs.filter(doc => {
              const data = doc.data();
              const subjectDept = data.department;
              const subjectGrade = data.grade;
              
              const deptMatch = 
                normalizeId(subjectDept) === normalizeId(department) ||
                String(subjectDept).includes(String(departmentName));
                
              const gradeMatch = 
                normalizeId(subjectGrade) === normalizeId(grade) ||
                String(subjectGrade).includes(String(gradeName));
                
              return deptMatch && gradeMatch;
            });
            
            if (matchedDocs.length > 0) {
              console.log(`Found ${matchedDocs.length} subjects with fuzzy matching`);
              subjectsSnapshot = { docs: matchedDocs, empty: false, size: matchedDocs.length };
            }
          }
          
          return subjectsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.id,
            department: department,
            departmentName: departmentName,
            grade: grade,
            gradeName: gradeName
          }));
        });
        
        const allSubjectsArrays = await Promise.all(subjectsPromises);
        const allSubjects = allSubjectsArrays.flat().sort((a, b) => {
          // Sort by department, then grade, then name
          const deptCompare = a.departmentName.localeCompare(b.departmentName);
          if (deptCompare !== 0) return deptCompare;
          const gradeCompare = a.gradeName.localeCompare(b.gradeName);
          return gradeCompare !== 0 ? gradeCompare : a.name.localeCompare(b.name);
        });
        
        console.log("Subjects loaded and sorted:", allSubjects);
        setSubjects(allSubjects);
        
        // Update subject name mapping
        const subjectMap = {};
        allSubjects.forEach(subject => {
          subjectMap[subject.id] = `${subject.departmentName} - ${subject.gradeName}: ${subject.name}`;
        });
        setSubjectNameMap(subjectMap);
        
      } catch (err) {
        console.error("Error loading subjects:", err);
      } finally {
        setSubjectsLoading(false);
      }
    };
    
    loadSubjects();
  }, [formData.departments, formData.grades, grades, userData?.role, departments]);

  // Add this useEffect to load existing items for the user details card
  useEffect(() => {
    const loadUserAssignedItems = async () => {
      if (!originalUserData.departments.length || userData?.role !== 'teacher') return;
      
      try {
        setLoading(true);
        
        // Load grades for user's departments
        const userGradesPromises = originalUserData.departments.map(async deptId => {
          const gradesRef = collection(db, 'grades');
          const gradesQuery = query(gradesRef, where('department', '==', deptId));
          const gradesSnapshot = await getDocs(gradesQuery);
          
          return gradesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.id,
            department: deptId
          }));
        });
        
        const userGradesArrays = await Promise.all(userGradesPromises);
        const userGrades = userGradesArrays.flat();
        
        // Create a mapping for grades
        const tempGradeMap = {};
        userGrades.forEach(grade => {
          const deptName = departments.find(d => d.id === grade.department)?.name || grade.department;
          tempGradeMap[grade.id] = `${deptName}: ${grade.name}`;
        });
        
        // Add to the grade name map
        setGradeNameMap(prev => ({ ...prev, ...tempGradeMap }));
        
        // Do similar for subjects if needed
        // ...
        
      } catch (err) {
        console.error("Error loading user's assigned items:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAssignedItems();
  }, [originalUserData.departments, departments, userData?.role]);

  // Add this useEffect to specifically load name mappings for existing user data
  useEffect(() => {
    const loadUserDataMappings = async () => {
      if (!rawUserData || !rawUserData.email) return;
      
      try {
        console.log("Loading name mappings for user details display");
        
        // 1. For departments - load all departments first
        if (Array.isArray(rawUserData.department) && rawUserData.department.length > 0) {
          const categoriesRef = collection(db, 'categories');
          const categoriesSnapshot = await getDocs(categoriesRef);
          
          const deptMap = { ...departmentNameMap };
          categoriesSnapshot.docs.forEach(doc => {
            deptMap[doc.id] = doc.data().name || doc.id;
          });
          
          // Add direct name mappings for department names
          rawUserData.department.forEach(dept => {
            if (typeof dept === 'string') {
              deptMap[dept] = dept;
            }
          });
          
          setDepartmentNameMap(deptMap);
          console.log("Department map updated:", deptMap);
        }
        
        // 2. For grades - load all grades related to user's departments
        if (Array.isArray(rawUserData.grades) && rawUserData.grades.length > 0) {
          const gradesRef = collection(db, 'grades');
          const allGradesSnapshot = await getDocs(gradesRef);
          
          const gradeMap = { ...gradeNameMap };
          
          // Process all grades
          allGradesSnapshot.docs.forEach(doc => {
            const gradeData = doc.data();
            const deptName = departmentNameMap[gradeData.department] || gradeData.department;
            gradeMap[doc.id] = `${deptName}: ${gradeData.name || doc.id}`;
          });
          
          // Add special handling for grades in format "Department|Grade"
          rawUserData.grades.forEach(grade => {
            if (typeof grade === 'string' && grade.includes('|')) {
              const [deptPart, gradePart] = grade.split('|');
              gradeMap[grade] = `${deptPart}: ${gradePart}`;
            }
          });
          
          setGradeNameMap(gradeMap);
          console.log("Grade map updated:", gradeMap);
        }
        
        // 3. For subjects - load all subjects or process existing names
        if (Array.isArray(rawUserData.subjects) && rawUserData.subjects.length > 0) {
          const subjectsRef = collection(db, 'subjects');
          const allSubjectsSnapshot = await getDocs(subjectsRef);
          
          const subjectMap = { ...subjectNameMap };
          
          // Process all subjects from database
          allSubjectsSnapshot.docs.forEach(doc => {
            const subjectData = doc.data();
            const deptName = departmentNameMap[subjectData.department] || subjectData.department;
            
            // Try to get grade name from grade ID
            let gradeName = subjectData.grade;
            if (gradeNameMap[subjectData.grade]) {
              gradeName = gradeNameMap[subjectData.grade].split(': ')[1];
            } else if (String(subjectData.grade).includes('|')) {
              gradeName = subjectData.grade.split('|')[1];
            }
            
            subjectMap[doc.id] = `${deptName} - ${gradeName}: ${subjectData.name || doc.id}`;
          });
          
          // Add direct mappings for subject names
          rawUserData.subjects.forEach(subject => {
            if (typeof subject === 'string' && !subjectMap[subject]) {
              // If it looks like a plain name, use it directly
              if (!subject.includes('|') && !subject.includes('-')) {
                subjectMap[subject] = subject;
              }
            }
          });
          
          setSubjectNameMap(subjectMap);
          console.log("Subject map updated:", subjectMap);
        }
        
      } catch (err) {
        console.error("Error loading user data mappings:", err);
      }
    };
    
    loadUserDataMappings();
  }, [rawUserData, departmentNameMap, gradeNameMap, subjectNameMap]);

  // Form field change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
        
    if (name === 'departments') {
      console.log("Selected departments:", value);
  
      // When departments change, reset grades and subjects
      setFormData(prev => ({
        ...prev,
        departments: value,
        grades: [], 
        subjects: []
      }));
  
      // Debug selected departments
      value.forEach(deptId => {
        const dept = departments.find(d => d.id === deptId);
        console.log(`Selected department: ${dept?.name || 'Unknown'} (ID: ${deptId})`);
      });
    } else if (name === 'grades') {
      // When grades change, reset subjects
      setFormData(prev => ({
        ...prev,
        grades: value,
        subjects: []
      }));
    } else {
      // For other fields
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Helper functions for checking if items are selected
  const isDepartmentSelected = (deptId) => 
    formData.departments.some(id => normalizeId(id) === normalizeId(deptId));
  
  const isGradeSelected = (gradeId) => 
    formData.grades.some(id => normalizeId(id) === normalizeId(gradeId));
  
  const isSubjectSelected = (subjectId) => 
    formData.subjects.some(id => normalizeId(id) === normalizeId(subjectId));

  // Form submission handler - updated to save names instead of IDs
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');
  
  try {
    // Basic validation
    if (!formData.name) {
      setError('Please enter a name');
      setLoading(false);
      return;
    }
    
    // Ensure at least one grade is selected for each department
    if (userData?.role === 'teacher') {
      // Rest of validation code...
    }
    
    // Create a clean set of departments to prevent duplicates
    const existingDepartments = Array.isArray(rawUserData.department) ? rawUserData.department : [];
    
    // Convert all to normalized strings for comparison
    const normalizedExistingDepts = existingDepartments.map(dept => 
      typeof dept === 'string' ? dept.toLowerCase().trim() : String(dept).toLowerCase().trim()
    );
    
    // Only add new departments that don't exist already (case-insensitive comparison)
    const newDepartments = formData.departments.filter(deptId => {
      // Get department name
      const deptObj = departments.find(d => d.id === deptId);
      const deptName = deptObj?.name || deptId;
      const normalizedDeptName = deptName.toLowerCase().trim();
      
      // Check if this department already exists (either by ID or name)
      return !normalizedExistingDepts.some(existingDept => 
        existingDept === deptId.toLowerCase().trim() || 
        existingDept === normalizedDeptName
      );
    });
    
    // Final department list with no duplicates
    const finalDepartments = [
      ...existingDepartments,
      ...newDepartments.map(id => {
        // Convert IDs to names for new departments
        const dept = departments.find(d => d.id === id);
        return dept?.name || id;
      })
    ];
    
    // Rest of your existing code for grades and subjects...
    const combinedGradeIds = [...new Set([
      ...(Array.isArray(rawUserData.grades) ? rawUserData.grades : []),
      ...formData.grades
    ])];
    
    const combinedSubjectIds = [...new Set([
      ...(Array.isArray(rawUserData.subjects) ? rawUserData.subjects : []),
      ...formData.subjects
    ])];
    
    // Convert IDs to proper format for grades and subjects
    const combinedGrades = combinedGradeIds.map(id => {
      // Your existing conversion code...
    });
    
    const combinedSubjects = combinedSubjectIds.map(id => {
      // Your existing conversion code...
    });
    
    // Update Firebase
    if (userData?.role === 'teacher') {
      if (rawUserData.documentId) {
        const teacherDocRef = doc(db, 'users', 'usersData', 'teachers', rawUserData.documentId);
        await updateDoc(teacherDocRef, {
          name: formData.name,
          // Now using the de-duplicated departments list
          department: finalDepartments, 
          grades: combinedGrades,
          subjects: combinedSubjects,
          updatedAt: new Date()
        });
      } else {
        // Fallback code...
      }
    } else if (userData?.role === 'admin') {
      // Admin update code...
    }
    
    setSuccess('User updated successfully');
    setTimeout(() => {
      navigate('/user-accounts');
    }, 1500);
    
  } catch (err) {
    console.error('Error updating user:', err);
    setError('Error updating user: ' + err.message);
  } finally {
    setLoading(false);
  }
};

  // Better name formatting for the user details card

  // First, let's create a utility function to format item names
  const getFormattedName = (id, collection, nameMap) => {
    // First try the name map
    if (nameMap[id]) return nameMap[id];
    
    // Next look in the loaded collection
    const item = collection.find(item => normalizeId(item.id) === normalizeId(id));
    if (item) {
      if (item.departmentName && item.name) {
        return `${item.departmentName}: ${item.name}`;
      }
      return item.name;
    }
    
    // For grades, try to parse format like "Department|Grade"
    const parts = id.split('|');
    if (parts.length > 1) {
      return `${parts[0]}: ${parts[1]}`;
    }
    
    // Return the ID as a fallback
    return id;
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* USER DETAILS CARD - Updated to handle loading state */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: '#011E41', mb: 2 }}>
          Current User Details
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography>Loading user details...</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <UserIcon color="primary" />
                  </ListItemIcon>
                  <MuiListItemText 
                    primary="Name" 
                    secondary={rawUserData.name || 'Not specified'} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <MuiListItemText 
                    primary="Email" 
                    secondary={rawUserData.email || 'Not specified'} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <RoleIcon color="primary" />
                  </ListItemIcon>
                  <MuiListItemText 
                    primary="Role" 
                    secondary={rawUserData.role === 'admin' ? 'Admin' : 'Teacher'} 
                  />
                </ListItem>
              </List>
            </Grid>
            
            {rawUserData.role === 'teacher' && (
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <DepartmentIcon color="primary" />
                    </ListItemIcon>
                    <MuiListItemText 
                      primary={<Typography color="primary.main" variant="subtitle2">Departments</Typography>}
                      secondary={
                        <>
                          {!rawUserData.department || 
                           (Array.isArray(rawUserData.department) && rawUserData.department.length === 0) ? (
                            <Typography variant="body2" color="text.secondary">None assigned</Typography>
                          ) : (
                            <Typography variant="body2">
                              {Array.isArray(rawUserData.department) 
                                ? rawUserData.department.join(', ')
                                : String(rawUserData.department)}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                          
                  <ListItem>
                    <ListItemIcon>
                      <GradeIcon color="primary" />
                    </ListItemIcon>
                    <MuiListItemText 
                      primary={<Typography color="primary.main" variant="subtitle2">Grades</Typography>}
                      secondary={
                        <>
                          {!rawUserData.grades || 
                           (Array.isArray(rawUserData.grades) && rawUserData.grades.length === 0) ? (
                            <Typography variant="body2" color="text.secondary">None assigned</Typography>
                          ) : (
                            <Typography variant="body2">
                              {Array.isArray(rawUserData.grades) 
                                ? rawUserData.grades.join(', ')
                                : String(rawUserData.grades)}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <SubjectIcon color="primary" />
                    </ListItemIcon>
                    <MuiListItemText 
                      primary={<Typography color="primary.main" variant="subtitle2">Subjects</Typography>}
                      secondary={
                        <>
                          {!rawUserData.subjects || 
                           (Array.isArray(rawUserData.subjects) && rawUserData.subjects.length === 0) ? (
                            <Typography variant="body2" color="text.secondary">None assigned</Typography>
                          ) : (
                            <Typography variant="body2">
                              {Array.isArray(rawUserData.subjects) 
                                ? rawUserData.subjects.join(', ')
                                : String(rawUserData.subjects)}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
            )}
          </Grid>
        )}
      </Paper>
      
      {/* EDIT USER FORM */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/user-accounts')} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: '#011E41' }}>
            Edit User
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {loading && !formData.name && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2, color: 'text.secondary' }}>
              Loading user data...
            </Typography>
          </Box>
        )}
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
        
        {(!loading || formData.name) && (
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <UserIcon color="primary" sx={{ mr: 1 }} />
                  }}
                />
              </Grid>
              
              {userData?.role === 'teacher' && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel>Add Departments</InputLabel>
                      <Select
                        multiple
                        name="departments"
                        value={formData.departments}
                        onChange={handleChange}
                        label="Add Departments"
                        disabled={departmentsLoading}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => {
                              const dept = departments.find(d => normalizeId(d.id) === normalizeId(value));
                              return (
                                <Chip 
                                  key={value} 
                                  label={dept ? dept.name : `ID: ${value}`} 
                                  sx={{ bgcolor: '#e3f2fd' }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {departmentsLoading ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
                          </MenuItem>
                        ) : departments.map((dept) => (
                          <MenuItem key={dept.id} value={dept.id}>
                            <Checkbox checked={isDepartmentSelected(dept.id)} />
                            <ListItemText primary={dept.name} />
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Select new departments to add to this user</FormHelperText>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth required disabled={!formData.departments.length || gradesLoading}>
                      <InputLabel>Grades</InputLabel>
                      <Select
                        multiple
                        name="grades"
                        value={formData.grades}
                        onChange={handleChange}
                        label="Grades"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => {
                              const grade = grades.find(g => normalizeId(g.id) === normalizeId(value));
                              return (
                                <Chip 
                                  key={value} 
                                  label={grade ? `${grade.departmentName}: ${grade.name}` : value} 
                                  sx={{ bgcolor: '#e3f2fd' }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {gradesLoading ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
                          </MenuItem>
                        ) : grades.length === 0 ? (
                          <MenuItem disabled>No grades available for selected departments</MenuItem>
                        ) : (
                          // Simplified approach to display unassigned grades
                          Object.entries(
                            grades.reduce((acc, grade) => {
                              // Initialize department in accumulator if needed
                              if (!acc[grade.departmentName]) acc[grade.departmentName] = [];
                              
                              // Check if grade is ALREADY assigned - simplified logic
                              const isAssigned = rawUserData?.grades?.some(existingGrade => 
                                // Direct ID comparison
                                normalizeId(existingGrade) === normalizeId(grade.id) || 
                                // Format comparison (Department: Grade)
                                existingGrade === `${grade.departmentName}: ${grade.name}` ||
                                // Format comparison (Department|Grade)
                                existingGrade === `${grade.departmentName}|${grade.name}`
                              );
                              
                              // Add to department's array if NOT already assigned
                              if (!isAssigned) {
                                acc[grade.departmentName].push(grade);
                              }
                              
                              return acc;
                            }, {})
                          ).map(([deptName, deptGrades]) => {
                            // Skip empty departments
                            if (deptGrades.length === 0) return null;
                            
                            return [
                              <ListSubheader key={`header-${deptName}`} sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                                {deptName}
                              </ListSubheader>,
                              ...deptGrades.map((grade) => (
                                <MenuItem key={grade.id} value={grade.id} sx={{ pl: 4 }}>
                                  <Checkbox checked={isGradeSelected(grade.id)} />
                                  <ListItemText primary={grade.name} />
                                </MenuItem>
                              ))
                            ];
                          }).filter(Boolean).flat()
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth disabled={!formData.grades.length || subjectsLoading}>
                      <InputLabel>Subjects</InputLabel>
                      <Select
                        multiple
                        name="subjects"
                        value={formData.subjects}
                        onChange={handleChange}
                        label="Subjects"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => {
                              const subject = subjects.find(s => normalizeId(s.id) === normalizeId(value));
                              return (
                                <Chip 
                                  key={value} 
                                  label={subject ? `${subject.departmentName} - ${subject.gradeName}: ${subject.name}` : value} 
                                  sx={{ bgcolor: '#e3f2fd' }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {subjectsLoading ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
                          </MenuItem>
                        ) : subjects.length === 0 ? (
                          <MenuItem disabled>No subjects available for selected grades</MenuItem>
                        ) : (
                          // Group subjects by department and grade
                          Object.entries(
                            subjects.reduce((acc, subject) => {
                              const key = `${subject.departmentName}|${subject.gradeName}`;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(subject);
                              return acc;
                            }, {})
                          ).map(([key, groupSubjects]) => {
                            const [deptName, gradeName] = key.split('|');
                            return [
                              <ListSubheader key={`header-${key}`} sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                                {`${deptName} - ${gradeName}`}
                              </ListSubheader>,
                              ...groupSubjects.map((subject) => (
                                <MenuItem key={subject.id} value={subject.id} sx={{ pl: 4 }}>
                                  <Checkbox checked={isSubjectSelected(subject.id)} />
                                  <ListItemText primary={subject.name} />
                                </MenuItem>
                              ))
                            ];
                          }).flat()
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate('/user-accounts')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={loading}
                    sx={{ minWidth: 120, bgcolor: '#011E41' }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default EditUser;