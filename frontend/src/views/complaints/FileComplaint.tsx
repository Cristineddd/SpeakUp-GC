import React from "react";
import FormalComplaint from "../complainant/FormalComplaint";

/**
 * FileComplaint page — dedicated route for filing a new complaint.
 * Wraps the existing FormalComplaint form so we keep a single source of truth
 * for the form logic while providing a clean /complaints/new URL.
 */
export default function FileComplaint() {
  return <FormalComplaint />;
}
