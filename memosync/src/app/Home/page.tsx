'use client';

import React, { useEffect, useState } from 'react';
import MemoHome from '@/components/MemoHomeComponent/MemoHome';

// メモの型定義
type Memo = {
  id: string;
  title: string;
  content: string;
};

export default function Home() {

  

  return (
    <div>
      <MemoHome />
    </div>
  );
}