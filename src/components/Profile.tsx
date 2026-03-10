"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import { ExperienceType, Profiletype } from "@/lib/types";

const certificationImages = ["/card-ai.jpg", "/card-community.jpg", "/card-guides.jpg"];

type CertificationItem = {
  title: string;
  image: string;
  file?: File;
};

export default function Profile() {
  const [profile, setProfile] = useState<Profiletype | null>(null);
  const [experience, setExperience] = useState<ExperienceType[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");

  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [isEditingCertifications, setIsEditingCertifications] = useState(false);

  const [aboutDraft, setAboutDraft] = useState("");
  const [experienceDraft, setExperienceDraft] = useState<string[]>([]);
  const [certificationsDraft, setCertificationsDraft] = useState<CertificationItem[]>([]);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCertImage, setSelectedCertImage] = useState<string | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await fetch("/api/profile_fetch");
        const data = await res.json();

        if (res.ok) {
          setProfile(data.user);
          setExperience(data.experiences || []);
          setAboutDraft(data.user?.about || "");
          setExperienceDraft((data.experiences || []).map((exp: ExperienceType) => exp.content));
          
          // Load certifications from database
          console.log("Fetched certifications from DB:", data.certifications);
          const dbCerts = (data.certifications || []).map((cert: any) => ({
            title: cert.title || "Untitled Certification",
            image: cert.address,
          }));
          console.log("Processed certifications:", dbCerts);
          // Always set certifications from DB (even if empty array)
          setCertifications(dbCerts);
          setCertificationsDraft(dbCerts.length > 0 ? dbCerts : [{ title: "", image: "" }]);
        } else {
          console.error(data.error);
        }
      } catch (error) {
        alert("Error fetching profile data");
      }

      setLoading(false);
    };

    getProfile(); 
  }, []);

  const handleAboutSave = async () => {
  try {
    const res = await fetch("/api/profile_update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        about: aboutDraft,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to update about section");
      return;
    }

    setProfile((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        about: aboutDraft,
      };
    });

    setIsEditingAbout(false);
  } catch (error) {
    alert("Error updating about section");
  }
};
 const handleExperienceSave = async () => {
  const cleaned = experienceDraft
    .filter((item) => item != null)
    .map((item) => item.trim())
    .filter(Boolean);

  try {
    const res = await fetch("/api/profile_update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        experiences: cleaned,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to update experience");
      return;
    }

    setExperience(
      cleaned.map((content, index) => ({
        id: `temp-${index}`,
        user_id: profile?.user_id || "",
        content,
      }))
    );

    setIsEditingExperience(false);
  } catch (error) {
    alert("Error updating experience");
  }
};

  const handleExperienceLineChange = (index: number, value: string) => {
    setExperienceDraft((prev) =>
      prev.map((item, lineIndex) => (lineIndex === index ? value : item))
    );
  };

  const handleAddExperienceLine = () => {
    setExperienceDraft((prev) => [...prev, ""]);
  };

  const handleRemoveExperienceLine = (index: number) => {
    setExperienceDraft((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  const handleCertificationsSave = async () => {
  if (!profile?.user_id) {
    alert("User not found");
    return;
  }

  try {
    const finalCerts: CertificationItem[] = [];

    for (const cert of certificationsDraft) {
      // Skip empty or undefined titles
      if (!cert.title || !cert.title.trim()) continue;

      // If there's a new file to upload
      if (cert.file) {
        const formData = new FormData();
        formData.append("file", cert.file);
        formData.append("user_id", profile.user_id);
        formData.append("title", cert.title.trim());

        const res = await fetch("/api/certification_upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        finalCerts.push({
          title: cert.title.trim(),
          image: data.url || cert.image,
        });
      } else {
        // Keep existing certification (no new file upload)
        finalCerts.push({
          title: cert.title.trim(),
          image: cert.image,
        });
      }
    }

    setCertifications(finalCerts);
    setIsEditingCertifications(false);

  } catch (error) {
    console.error(error);
    alert("Error saving certifications");
  }
};

  const handleCertificationTitleChange = (index: number, value: string) => {
    setCertificationsDraft((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item))
    );
  };

 const handleCertificationImageUpload = (index: number, file: File | null) => {
  if (!file) return;

  const preview = URL.createObjectURL(file);

  setCertificationsDraft((prev) => {
    const updated = [...prev];

    updated[index] = {
      ...updated[index],
      image: preview,
      file: file,
    };

    return updated;
  });
};

  const handleAddCertification = () => {
    setCertificationsDraft((prev) => [
      ...prev,
      { title: "", image: "" },
    ]);
  };

  const handleRemoveCertification = (index: number) => {
    setCertificationsDraft((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleProfilePictureUpload = async (file: File | null) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setProfile((prev) => (prev ? { ...prev, profile_picture: preview } : prev));
    setIsUploadingProfilePicture(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile_picture_upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload profile picture");
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              profile_picture: data.url || preview,
            }
          : prev
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to upload profile picture");
    } finally {
      setIsUploadingProfilePicture(false);
    }
  };

  if (loading) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex gap-6 max-w-6xl mx-auto p-6 mt-6">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-4 gap-3">
            <div className="relative w-32 h-32">
              {profile?.profile_picture ? (
                <img
                  src={profile.profile_picture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = "/file.svg";
                  }}
                />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-3xl text-gray-500 font-semibold">
                  {(profile?.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              {isUploadingProfilePicture && (
                <div className="absolute inset-0 rounded-full bg-black/40 text-white text-xs flex items-center justify-center">
                  Uploading...
                </div>
              )}
            </div>
            <input
              ref={profilePictureInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleProfilePictureUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => profilePictureInputRef.current?.click()}
              disabled={isUploadingProfilePicture}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              {isUploadingProfilePicture ? "Uploading..." : "Change photo"}
            </button>
          </div>
          
          {/* Name and Username */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">
              {profile?.name || "User Name"}
            </h2>
          
          </div>

          {/* Stats */}
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Member Since:</span>{" "}
              {new Date(profile?.created_at || "").toLocaleDateString()}
            </p>
            <p>
              <span className="font-semibold">Guides:</span> 0
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => setActiveTab("about")}
            className={`w-full text-left px-6 py-3 border-b flex items-center gap-2 ${
              activeTab === "about" ? "bg-gray-100 font-semibold" : ""
            }`}
          >
            <img src="/about-description-help-svgrepo-com.svg" alt="About" className="w-5 h-5" />
            About
          </button>
          <button
            onClick={() => setActiveTab("contributions")}
            className={`w-full text-left px-6 py-3 border-b flex items-center gap-2 ${
              activeTab === "contributions" ? "bg-gray-100 font-semibold" : ""
            }`}
          >
            <img src="/notes-lines-svgrepo-com.svg" alt="Contributions" className="w-5 h-5" />
            Contributions
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`w-full text-left px-6 py-3 flex items-center gap-2 ${
              activeTab === "activity" ? "bg-gray-100 font-semibold" : ""
            }`}
          >
            <img src="/shifts-activity-svgrepo-com.svg" alt="Activity" className="w-5 h-5" />
            Activity
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-lg shadow p-8">
        {activeTab === "about" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">About</h1>
              <button
                type="button"
                onClick={() => {
                  setAboutDraft(profile?.about || "");
                  setIsEditingAbout(true);
                }}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Edit About"
              >
                <img src="/edit-3-svgrepo-com.svg" alt="Edit About" className="w-5 h-5" />
              </button>
            </div>

            {isEditingAbout ? (
              <div className="mb-8">
                <textarea
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  className="w-full min-h-28 p-3 border border-gray-300 rounded-md text-gray-700"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleAboutSave}
                    className="px-4 py-2 bg-gray-900 text-white rounded-md"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAboutDraft(profile?.about || "");
                      setIsEditingAbout(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mb-8 text-gray-700">
                {profile?.about || "No about information available."}
              </p>
            )}

            <hr className="border-t border-gray-300 mb-8" />

            {/* Experience Section */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Experience</h2>
                <button
                  type="button"
                  onClick={() => {
                    setExperienceDraft(
                      experience.length > 0 ? experience.map((exp) => exp.content) : [""]
                    );
                    setIsEditingExperience(true);
                  }}
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Edit Experience"
                >
                  <img src="/edit-3-svgrepo-com.svg" alt="Edit Experience" className="w-5 h-5" />
                </button>
              </div>

              {isEditingExperience ? (
                <div>
                  <div className="space-y-2">
                    {experienceDraft.map((line, index) => (
                      <div key={`experience-line-${index}`} className="flex gap-2">
                        <input
                          type="text"
                          value={line}
                          onChange={(e) => handleExperienceLineChange(index, e.target.value)}
                          className="flex-1 p-3 border border-gray-300 rounded-md text-gray-700"
                          placeholder={`Experience line ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExperienceLine(index)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddExperienceLine}
                    className="mt-3 px-4 py-2 border border-gray-300 rounded-md"
                  >
                    Add line
                  </button>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleExperienceSave}
                      className="px-4 py-2 bg-gray-900 text-white rounded-md"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExperienceDraft(
                          experience.length > 0 ? experience.map((exp) => exp.content) : [""]
                        );
                        setIsEditingExperience(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {experience.length > 0 ? (
                    experience.map((exp) => (
                      <li key={exp.id}>{exp.content}</li>
                    ))
                  ) : (
                    <li>No experience added yet.</li>
                  )}
                </ul>
              )}
            </section>

            <hr className="border-t border-gray-300 mb-8" />

            {/* Certifications Section */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Certifications</h2>
                <button
                  type="button"
                  onClick={() => {
                    setCertificationsDraft(
               certifications.length > 0
                 ? certifications.map((c) => ({ ...c }))
                     : [{ title: "", image: "" }]
                    );
                    setIsEditingCertifications(true);
                  }}
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Edit Certifications"
                >
                  <img src="/edit-3-svgrepo-com.svg" alt="Edit Certifications" className="w-5 h-5" />
                </button>
              </div>

              {isEditingCertifications ? (
                <div>
                  <div className="space-y-3">
                    {certificationsDraft.map((certification, index) => (
                      <div
                        key={`certification-edit-${index}`}
                        className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center"
                      >
                        {certification.image ? (
                          <img
                            src={certification.image}
                            alt={certification.title || `Certification ${index + 1}`}
                            className="h-16 w-24 rounded-md object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="h-16 w-24 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={certification.title || ""}
                            onChange={(e) => handleCertificationTitleChange(index, e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                            placeholder={`Certification title ${index + 1}`}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleCertificationImageUpload(index, e.target.files?.[0] || null)
                            }
                            className="w-full text-sm text-gray-700"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCertification(index)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCertification}
                    className="mt-3 px-4 py-2 border border-gray-300 rounded-md"
                  >
                    Add certification
                  </button>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCertificationsSave}
                      className="px-4 py-2 bg-gray-900 text-white rounded-md"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCertificationsDraft(
                          certifications.length > 0
                            ? certifications
                            : [{ title: "", image: "" }]
                        );
                        setIsEditingCertifications(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {certifications.length > 0 ? (
                    certifications.map((certification, index) => (
                      <div
                        key={`${certification.title || 'cert'}-${index}`}
                        className="flex items-center gap-4 rounded-lg border border-gray-200 p-3"
                      >
                        {certification.image ? (
                          <img
                            src={certification.image}
                            alt={certification.title || `Certification ${index + 1}`}
                            className="h-16 w-24 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedCertImage(certification.image)}
                          />
                        ) : (
                          <div className="h-16 w-24 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                        <p className="text-gray-800 font-medium">{certification.title || "Untitled Certification"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-700">No certification available</p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "contributions" && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Contributions</h1>
            <p className="text-gray-700">Your contributions will appear here.</p>
          </div>
        )}

        {activeTab === "activity" && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Activity</h1>
            <p className="text-gray-700">Your activity will appear here.</p>
          </div>
        )}
      </div>
      </div>

      {/* Certificate Image Modal */}
      {selectedCertImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCertImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedCertImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-xl font-bold"
            >
              ✕ Close
            </button>
            <img
              src={selectedCertImage}
              alt="Certificate"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}