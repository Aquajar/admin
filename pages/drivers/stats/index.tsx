import Wrapper from "@/components/Wrapper";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useAxiosInstance from "@/lib/hooks/useAxiosInstance";
import { Staff } from "@/types/types";
import PerformanceChart from "@/components/Driver/Charts/PerformanceChart";


const DriverStats = () => {
    const { data: session } = useSession();

    const axiosInstance = useAxiosInstance(session);

    const [data, setData] = useState<Staff[] | null>(null);

    const getStaffData = async () => {
        const URL = process.env.NEXT_PUBLIC_API_URL;

        let { data } = await axiosInstance.get(`${URL}/staff`);
        console.log(data);
        setData(data);
    };

    useEffect(() => {
        if (session && !data) getStaffData();
    }, [session, data]);

    return (
        <Wrapper>
            <div className="p-3 border rounded-xl bg-white">
                <PerformanceChart />
            </div>
        </Wrapper>
    );
}

export default DriverStats;
