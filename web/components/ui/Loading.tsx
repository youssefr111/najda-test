import { FC } from 'react';

const Loading: FC = () => {
  return (
    <main className='flex grow justify-center items-center'>

      <div className='flex w-full space-x-2 justify-center items-center bg-white h-screen dark:invert'>
        <span className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></span>
      </div>
      
    </main>
  )
}

export default Loading;