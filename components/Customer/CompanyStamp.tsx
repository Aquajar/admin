import React, { FC } from "react";

/**
 * Aquajar's round rubber stamp (the scanned original), used on the Water Card
 * PDF for authenticity. The scan lives at admin/public/images/stamp.png.
 *
 * The Water Card waits for every <img> in its template to finish loading before
 * html2canvas captures it, so this renders cleanly into the PDF.
 */

interface IProps {
  size?: number;
}

const CompanyStamp: FC<IProps> = ({ size = 160 }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/images/stamp.png"
    alt="Aquajar company stamp"
    width={size}
    height={size}
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      transform: "rotate(-5deg)",
    }}
  />
);

export default CompanyStamp;
