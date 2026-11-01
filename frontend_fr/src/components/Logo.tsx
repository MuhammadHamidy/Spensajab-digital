import React from 'react';
import Image from "next/image";
import {Images} from "@/components/style-guide/image/image";

function Logo(props: React.HTMLAttributes<HTMLImageElement>) {
  return (
    <Image src={Images.logo.src} alt={Images.logo.alt} height={Images.logo.height}
           width={Images.logo.width} {...props}/>
  );
}

export default Logo;